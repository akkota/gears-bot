import { EmbedBuilder, type Guild, type GuildMember, type User } from "discord.js";
import { getGuildSettings } from "../../../db/guildSettingsRepo.js";
import {
  createModerationCase,
  createModerationCaseTargets,
} from "../../../db/moderationRepo.js";
import { isSendableTextChannel } from "../../../shared/discordChecks.js";

export interface PersistBanInput {
  guild: Guild;
  targetUserId: string;
  moderator: User;
  reason: string | null;
  deleteMessageDays: number;
  targetInGuild: boolean;
}

export async function persistBan(
  input: PersistBanInput,
): Promise<{ caseId: string }> {
  const moderationCase = await createModerationCase({
    guildId: input.guild.id,
    action: "ban",
    targetUserId: input.targetUserId,
    moderatorUserId: input.moderator.id,
    reason: input.reason,
    channelId: null,
    metadata: {
      delete_message_days: input.deleteMessageDays,
      target_in_guild: input.targetInGuild,
    },
  });

  return { caseId: moderationCase.id };
}

function buildBanLogEmbed(params: {
  moderator: User;
  targetLabel: string;
  targetUserId: string;
  reason: string | null;
  deleteMessageDays: number;
  caseId: string;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xb91c1c)
    .setTitle("User Banned")
    .addFields(
      {
        name: "Target",
        value: `${params.targetLabel} (${params.targetUserId})`,
      },
      {
        name: "Moderator",
        value: `${params.moderator.tag} (${params.moderator.id})`,
      },
      {
        name: "Delete Message Days",
        value: String(params.deleteMessageDays),
        inline: true,
      },
      { name: "Reason", value: params.reason ?? "No reason provided." },
      { name: "Case ID", value: params.caseId },
    );
}

export async function sendBanLogIfConfigured(params: {
  guild: Guild;
  moderator: User;
  targetLabel: string;
  targetUserId: string;
  reason: string | null;
  deleteMessageDays: number;
  caseId: string;
}): Promise<void> {
  const settings = await getGuildSettings(params.guild.id);
  const logChannelId = settings?.logChannelId ?? null;

  if (!logChannelId) {
    return;
  }

  const logChannel = await params.guild.channels
    .fetch(logChannelId)
    .catch(() => null);

  if (!isSendableTextChannel(logChannel)) {
    return;
  }

  const embed = buildBanLogEmbed({
    moderator: params.moderator,
    targetLabel: params.targetLabel,
    targetUserId: params.targetUserId,
    reason: params.reason,
    deleteMessageDays: params.deleteMessageDays,
    caseId: params.caseId,
  });

  await logChannel.send({ embeds: [embed] }).catch(() => undefined);
}

export function parseUserIdInput(raw: string): string | null {
  const trimmed = raw.trim();
  const mentionMatch = trimmed.match(/^<@!?(\d+)>$/);
  const idCandidate = mentionMatch ? mentionMatch[1] : trimmed;

  if (!/^\d{17,20}$/.test(idCandidate)) {
    return null;
  }

  return idCandidate;
}

export function parseMassbanUserIds(raw: string): {
  validIds: string[];
  invalidEntries: string[];
} {
  const tokens = raw
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const valid = new Set<string>();
  const invalid: string[] = [];

  for (const token of tokens) {
    const parsed = parseUserIdInput(token);
    if (parsed) {
      valid.add(parsed);
      continue;
    }

    invalid.push(token);
  }

  return {
    validIds: [...valid],
    invalidEntries: invalid,
  };
}

export async function persistMassBanCase(input: {
  guild: Guild;
  moderator: User;
  reason: string | null;
  requestedIds: string[];
  invalidIds: string[];
}): Promise<{ caseId: string }> {
  const moderationCase = await createModerationCase({
    guildId: input.guild.id,
    action: "massban",
    targetUserId: null,
    moderatorUserId: input.moderator.id,
    reason: input.reason,
    channelId: null,
    metadata: {
      requested_ids: input.requestedIds,
      invalid_ids: input.invalidIds,
    },
  });

  return { caseId: moderationCase.id };
}

export async function persistMassBanTargets(input: {
  caseId: string;
  results: Array<{
    targetUserId: string;
    success: boolean;
    errorMessage: string | null;
  }>;
}): Promise<void> {
  await createModerationCaseTargets(
    input.results.map((result) => ({
      caseId: input.caseId,
      targetUserId: result.targetUserId,
      success: result.success,
      errorMessage: result.errorMessage,
    })),
  );
}

function buildMassBanLogEmbed(params: {
  moderator: User;
  caseId: string;
  reason: string | null;
  requestedCount: number;
  invalidCount: number;
  successCount: number;
  failureCount: number;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x991b1b)
    .setTitle("Massban Executed")
    .addFields(
      {
        name: "Moderator",
        value: `${params.moderator.tag} (${params.moderator.id})`,
      },
      { name: "Requested", value: String(params.requestedCount), inline: true },
      { name: "Invalid", value: String(params.invalidCount), inline: true },
      { name: "Succeeded", value: String(params.successCount), inline: true },
      { name: "Failed", value: String(params.failureCount), inline: true },
      { name: "Reason", value: params.reason ?? "No reason provided." },
      { name: "Case ID", value: params.caseId },
    );
}

export async function sendMassBanLogIfConfigured(params: {
  guild: Guild;
  moderator: User;
  caseId: string;
  reason: string | null;
  requestedCount: number;
  invalidCount: number;
  successCount: number;
  failureCount: number;
}): Promise<void> {
  const settings = await getGuildSettings(params.guild.id);
  const logChannelId = settings?.logChannelId ?? null;

  if (!logChannelId) {
    return;
  }

  const logChannel = await params.guild.channels
    .fetch(logChannelId)
    .catch(() => null);

  if (!isSendableTextChannel(logChannel)) {
    return;
  }

  const embed = buildMassBanLogEmbed({
    moderator: params.moderator,
    caseId: params.caseId,
    reason: params.reason,
    requestedCount: params.requestedCount,
    invalidCount: params.invalidCount,
    successCount: params.successCount,
    failureCount: params.failureCount,
  });

  await logChannel.send({ embeds: [embed] }).catch(() => undefined);
}
