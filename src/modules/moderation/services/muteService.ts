import { EmbedBuilder, type Guild, type GuildMember, type User } from "discord.js";
import { getGuildSettings } from "../../../db/guildSettingsRepo.js";
import {
  createModerationCase,
  upsertActiveMute,
} from "../../../db/moderationRepo.js";
import { isSendableTextChannel } from "../../../shared/discordChecks.js";

export interface PersistMuteInput {
  guild: Guild;
  targetMember: GuildMember;
  moderator: User;
  reason: string | null;
  durationMs: number;
  durationLabel: string;
}

export async function persistMute(input: PersistMuteInput): Promise<{
  caseId: string;
  expiresAt: Date;
}> {
  const expiresAt = new Date(Date.now() + input.durationMs);

  const moderationCase = await createModerationCase({
    guildId: input.guild.id,
    action: "mute",
    targetUserId: input.targetMember.id,
    moderatorUserId: input.moderator.id,
    reason: input.reason,
    channelId: null,
    metadata: {
      duration_label: input.durationLabel,
      duration_ms: input.durationMs,
      timeout_until: expiresAt.toISOString(),
      type: "timeout",
    },
  });

  await upsertActiveMute({
    guildId: input.guild.id,
    userId: input.targetMember.id,
    caseId: moderationCase.id,
    mutedByUserId: input.moderator.id,
    reason: input.reason,
    expiresAt: expiresAt.toISOString(),
  });

  return {
    caseId: moderationCase.id,
    expiresAt,
  };
}

export async function persistVoiceMute(input: {
  guild: Guild;
  targetMember: GuildMember;
  moderator: User;
  reason: string | null;
}): Promise<{ caseId: string }> {
  const moderationCase = await createModerationCase({
    guildId: input.guild.id,
    action: "mute",
    targetUserId: input.targetMember.id,
    moderatorUserId: input.moderator.id,
    reason: input.reason,
    channelId: input.targetMember.voice.channelId ?? null,
    metadata: {
      type: "voice",
      voice_channel_id: input.targetMember.voice.channelId ?? null,
    },
  });

  await upsertActiveMute({
    guildId: input.guild.id,
    userId: input.targetMember.id,
    caseId: moderationCase.id,
    mutedByUserId: input.moderator.id,
    reason: input.reason,
    expiresAt: null,
  });

  return { caseId: moderationCase.id };
}

function buildMuteLogEmbed(params: {
  moderator: User;
  targetMember: GuildMember;
  durationLabel: string;
  reason: string | null;
  caseId: string;
  expiresAt: Date | null;
  type: "timeout" | "voice";
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0xdc2626)
    .setTitle(params.type === "voice" ? "Member Voice Muted" : "Member Timed Out")
    .addFields(
      {
        name: "Target",
        value: `${params.targetMember.user.tag} (${params.targetMember.id})`,
      },
      {
        name: "Moderator",
        value: `${params.moderator.tag} (${params.moderator.id})`,
      },
      { name: "Duration", value: params.durationLabel, inline: true },
      { name: "Reason", value: params.reason ?? "No reason provided." },
      { name: "Case ID", value: params.caseId },
    );

  if (params.expiresAt) {
    const unix = Math.floor(params.expiresAt.getTime() / 1000);
    embed.addFields({ name: "Expires", value: `<t:${unix}:F>`, inline: true });
  } else {
    embed.addFields({ name: "Type", value: "Voice", inline: true });
  }

  return embed;
}

export async function sendMuteLogIfConfigured(params: {
  guild: Guild;
  moderator: User;
  targetMember: GuildMember;
  durationLabel: string;
  reason: string | null;
  caseId: string;
  expiresAt: Date | null;
  type: "timeout" | "voice";
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

  const embed = buildMuteLogEmbed({
    moderator: params.moderator,
    targetMember: params.targetMember,
    durationLabel: params.type === "voice" ? "Voice Mute" : params.durationLabel,
    reason: params.reason,
    caseId: params.caseId,
    expiresAt: params.expiresAt,
    type: params.type,
  });

  await logChannel.send({ embeds: [embed] }).catch(() => undefined);
}
