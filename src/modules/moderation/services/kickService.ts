import { EmbedBuilder, type Guild, type GuildMember, type User } from "discord.js";
import { getGuildSettings } from "../../../db/guildSettingsRepo.js";
import { createModerationCase } from "../../../db/moderationRepo.js";
import { isSendableTextChannel } from "../../../shared/discordChecks.js";

export interface PersistKickInput {
  guild: Guild;
  targetMember: GuildMember;
  moderator: User;
  reason: string | null;
}

export async function persistKick(
  input: PersistKickInput,
): Promise<{ caseId: string }> {
  const moderationCase = await createModerationCase({
    guildId: input.guild.id,
    action: "kick",
    targetUserId: input.targetMember.id,
    moderatorUserId: input.moderator.id,
    reason: input.reason,
    channelId: null,
    metadata: {},
  });

  return { caseId: moderationCase.id };
}

function buildKickLogEmbed(params: {
  moderator: User;
  targetMember: GuildMember;
  reason: string | null;
  caseId: string;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("Member Kicked")
    .addFields(
      {
        name: "Target",
        value: `${params.targetMember.user.tag} (${params.targetMember.id})`,
      },
      {
        name: "Moderator",
        value: `${params.moderator.tag} (${params.moderator.id})`,
      },
      { name: "Reason", value: params.reason ?? "No reason provided." },
      { name: "Case ID", value: params.caseId },
    );
}

export async function sendKickLogIfConfigured(params: {
  guild: Guild;
  moderator: User;
  targetMember: GuildMember;
  reason: string | null;
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

  const embed = buildKickLogEmbed({
    moderator: params.moderator,
    targetMember: params.targetMember,
    reason: params.reason,
    caseId: params.caseId,
  });

  await logChannel.send({ embeds: [embed] }).catch(() => undefined);
}
