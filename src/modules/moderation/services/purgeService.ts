import { EmbedBuilder, type Guild, type GuildTextBasedChannel, type User } from "discord.js";
import { getGuildSettings } from "../../../db/guildSettingsRepo.js";
import {
  createModerationCase,
  createPurgeLog,
} from "../../../db/moderationRepo.js";
import { isSendableTextChannel } from "../../../shared/discordChecks.js";

export interface PersistPurgeSummaryInput {
  guild: Guild;
  channelId: string;
  moderator: User;
  amountRequested: number;
  amountDeleted: number;
  filterUserId: string | null;
  reason: string | null;
}

export async function persistPurgeSummary(
  input: PersistPurgeSummaryInput,
): Promise<{ caseId: string }> {
  const moderationCase = await createModerationCase({
    guildId: input.guild.id,
    action: "purge",
    targetUserId: input.filterUserId,
    moderatorUserId: input.moderator.id,
    reason: input.reason,
    channelId: input.channelId,
    metadata: {
      amount_requested: input.amountRequested,
      amount_deleted: input.amountDeleted,
      filter_user_id: input.filterUserId,
    },
  });

  await createPurgeLog({
    guildId: input.guild.id,
    channelId: input.channelId,
    moderatorUserId: input.moderator.id,
    amountRequested: input.amountRequested,
    amountDeleted: input.amountDeleted,
    filterUserId: input.filterUserId,
    reason: input.reason,
    caseId: moderationCase.id,
  });

  return { caseId: moderationCase.id };
}

function buildPurgeLogEmbed(params: {
  moderator: User;
  channelId: string;
  amountRequested: number;
  amountDeleted: number;
  filterUserId: string | null;
  reason: string | null;
  caseId: string;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("Purge Executed")
    .addFields(
      {
        name: "Moderator",
        value: `${params.moderator.tag} (${params.moderator.id})`,
      },
      { name: "Channel", value: `<#${params.channelId}>`, inline: true },
      { name: "Requested", value: String(params.amountRequested), inline: true },
      { name: "Deleted", value: String(params.amountDeleted), inline: true },
      {
        name: "Filtered User",
        value: params.filterUserId ? `<@${params.filterUserId}>` : "None",
        inline: true,
      },
      { name: "Reason", value: params.reason ?? "No reason provided." },
      { name: "Case ID", value: params.caseId },
    );
}

export async function sendPurgeLogIfConfigured(params: {
  guild: Guild;
  moderator: User;
  channelId: string;
  amountRequested: number;
  amountDeleted: number;
  filterUserId: string | null;
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

  const embed = buildPurgeLogEmbed({
    moderator: params.moderator,
    channelId: params.channelId,
    amountRequested: params.amountRequested,
    amountDeleted: params.amountDeleted,
    filterUserId: params.filterUserId,
    reason: params.reason,
    caseId: params.caseId,
  });

  await logChannel.send({ embeds: [embed] }).catch(() => undefined);
}

export function getPurgeEligibleChannel(
  channel: unknown,
): GuildTextBasedChannel | null {
  if (!channel || typeof channel !== "object") {
    return null;
  }

  if (!("isTextBased" in channel) || !("bulkDelete" in channel)) {
    return null;
  }

  return channel as GuildTextBasedChannel;
}
