import {
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type Message,
  type TextBasedChannel,
} from "discord.js";
import { getActiveGardenBoost } from "../../../db/gardenRepo.js";
import {
  getUserXp,
  upsertUserXp,
  type UserXpRecord,
} from "../../../db/userXpRepo.js";
import { listLevelRoles } from "../../../db/levelRolesRepo.js";
import { formatGardenUnlocks } from "../../garden/services/gardenCatalog.js";
import { levelFromXp } from "./levelMath.js";
import {
  formatUnlockMessage,
  getCrossedRanks,
  getCurrentRank,
  resolveLadder,
  type RankDefinition,
} from "./rankLadder.js";

export const MESSAGE_XP_AMOUNT = 25;
export const MESSAGE_XP_COOLDOWN_MS = 30_000;
export const MAX_STORED_XP = 10_000_000;

export interface XpChangeResult {
  previousXp: number;
  xp: number;
  previousLevel: number;
  level: number;
  previousRank: RankDefinition | null;
  currentRank: RankDefinition | null;
  crossedRanks: RankDefinition[];
  unlockMessage: string | null;
}

function guildRecord(guild: Guild) {
  return {
    guildId: guild.id,
    guildName: guild.name,
    guildIconUrl: guild.iconURL(),
    guildOwnerId: guild.ownerId ?? null,
  };
}

export async function loadLadder(guildId: string): Promise<RankDefinition[]> {
  const stored = await listLevelRoles(guildId);
  return resolveLadder(
    stored.map((row) => ({
      name: row.name,
      requiredLevel: row.requiredLevel,
      discordRoleId: row.discordRoleId,
    })),
  );
}

export async function getXpSnapshot(
  guildId: string,
  userId: string,
): Promise<{ xp: number; level: number; record: UserXpRecord | null }> {
  const record = await getUserXp(guildId, userId);
  const xp = record?.xp ?? 0;
  return { xp, level: levelFromXp(xp), record };
}

export async function applyXpChange(params: {
  guild: Guild;
  member: GuildMember | null;
  userId: string;
  nextXp: number;
  touchMessageCooldown?: boolean;
}): Promise<XpChangeResult> {
  const nextXp = Math.max(0, Math.min(MAX_STORED_XP, Math.floor(params.nextXp)));
  const previous = await getUserXp(params.guild.id, params.userId);
  const previousXp = previous?.xp ?? 0;
  const previousLevel = levelFromXp(previousXp);
  const level = levelFromXp(nextXp);
  const ladder = await loadLadder(params.guild.id);
  const previousRank = getCurrentRank(previousLevel, ladder);
  const currentRank = getCurrentRank(level, ladder);
  const crossedRanks = getCrossedRanks(previousLevel, level, ladder);

  await upsertUserXp({
    ...guildRecord(params.guild),
    userId: params.userId,
    xp: nextXp,
    lastMessageXpAt: params.touchMessageCooldown ? new Date().toISOString() : previous?.lastMessageXpAt,
  });

  if (params.member) {
    await syncLevelRoles(params.member, ladder, currentRank).catch((error) => {
      console.error("Failed to sync level roles:", error);
    });
  }

  const rankUnlock = formatUnlockMessage(crossedRanks);
  const gardenUnlock = formatGardenUnlocks(previousLevel, level);
  const unlockMessage = [rankUnlock, gardenUnlock].filter(Boolean).join("\n") || null;

  return {
    previousXp,
    xp: nextXp,
    previousLevel,
    level,
    previousRank,
    currentRank,
    crossedRanks,
    unlockMessage,
  };
}

export async function addXp(params: {
  guild: Guild;
  member: GuildMember | null;
  userId: string;
  amount: number;
}): Promise<XpChangeResult> {
  const current = await getUserXp(params.guild.id, params.userId);
  return applyXpChange({
    guild: params.guild,
    member: params.member,
    userId: params.userId,
    nextXp: (current?.xp ?? 0) + params.amount,
  });
}

export function isOnMessageXpCooldown(record: UserXpRecord | null, now = Date.now()): boolean {
  if (!record?.lastMessageXpAt) {
    return false;
  }

  const last = Date.parse(record.lastMessageXpAt);
  if (Number.isNaN(last)) {
    return false;
  }

  return now - last < MESSAGE_XP_COOLDOWN_MS;
}

export async function handleMessageXp(message: Message): Promise<string | null> {
  if (!message.inGuild() || !message.guild || message.author.bot) {
    return null;
  }

  const record = await getUserXp(message.guild.id, message.author.id);
  if (isOnMessageXpCooldown(record)) {
    return null;
  }

  const member =
    message.member ??
    (await message.guild.members.fetch(message.author.id).catch(() => null));

  const boost = await getActiveGardenBoost(message.guild.id, message.author.id).catch(() => null);
  const amount = boost
    ? Math.max(1, Math.floor(MESSAGE_XP_AMOUNT * boost.multiplier))
    : MESSAGE_XP_AMOUNT;

  const result = await applyXpChange({
    guild: message.guild,
    member,
    userId: message.author.id,
    nextXp: (record?.xp ?? 0) + amount,
    touchMessageCooldown: true,
  });

  return result.unlockMessage;
}

export async function syncLevelRoles(
  member: GuildMember,
  ladder: RankDefinition[],
  currentRank: RankDefinition | null,
): Promise<void> {
  const managedIds = ladder
    .map((rank) => rank.discordRoleId)
    .filter((roleId): roleId is string => Boolean(roleId));

  if (managedIds.length === 0) {
    return;
  }

  const botMember = member.guild.members.me;
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return;
  }

  const desiredId = currentRank?.discordRoleId ?? null;
  const toRemove = managedIds.filter(
    (roleId) => roleId !== desiredId && member.roles.cache.has(roleId),
  );

  for (const roleId of toRemove) {
    const role = member.guild.roles.cache.get(roleId);
    if (!role || role.comparePositionTo(botMember.roles.highest) >= 0) {
      continue;
    }
    await member.roles.remove(role, "Level rank sync").catch(() => undefined);
  }

  if (!desiredId || member.roles.cache.has(desiredId)) {
    return;
  }

  const desired = member.guild.roles.cache.get(desiredId);
  if (!desired || desired.comparePositionTo(botMember.roles.highest) >= 0) {
    return;
  }

  await member.roles.add(desired, "Level rank sync").catch(() => undefined);
}

export async function sendUnlockNotice(
  channel: TextBasedChannel | null,
  userId: string,
  unlockMessage: string | null,
): Promise<void> {
  if (!unlockMessage || !channel || !("send" in channel)) {
    return;
  }

  await channel
    .send({ content: `<@${userId}> ${unlockMessage}` })
    .catch(() => undefined);
}
