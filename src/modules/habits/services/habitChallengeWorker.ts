import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type Client,
} from "discord.js";
import { getGuildSettings, listGuildSettings } from "../../../db/guildSettingsRepo.js";
import {
  attachHabitDiscordMessage,
  getHabitProofSignedUrl,
  listPendingHabitLogsWithoutDiscord,
  resolveHabitLogFromDiscord,
} from "../../../db/habitLogsRepo.js";
import { getMemberPermissionLevel, hasLevel } from "../../../shared/permissions.js";

const POLL_MS = 20_000;
const APPROVE_PREFIX = "habit:approve:";
const REJECT_PREFIX = "habit:reject:";

let interval: NodeJS.Timeout | null = null;
let running = false;

export function parseHabitButtonCustomId(
  customId: string,
): { action: "approve" | "reject"; logId: string } | null {
  if (customId.startsWith(APPROVE_PREFIX)) {
    return { action: "approve", logId: customId.slice(APPROVE_PREFIX.length) };
  }
  if (customId.startsWith(REJECT_PREFIX)) {
    return { action: "reject", logId: customId.slice(REJECT_PREFIX.length) };
  }
  return null;
}

async function processPending(client: Client): Promise<void> {
  if (running) {
    return;
  }
  running = true;
  try {
    const settings = await listGuildSettings();
    const channelByGuild = new Map(
      settings
        .filter((row) => row.habitChallengeChannelId)
        .map((row) => [row.guildId, row.habitChallengeChannelId as string]),
    );

    if (channelByGuild.size === 0) {
      return;
    }

    const pending = await listPendingHabitLogsWithoutDiscord(25);
    for (const log of pending) {
      for (const [guildId, channelId] of channelByGuild) {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (
          !channel ||
          !channel.isTextBased() ||
          !("send" in channel) ||
          !("guild" in channel) ||
          channel.guild?.id !== guildId
        ) {
          continue;
        }

        const imageUrl = await getHabitProofSignedUrl(log.imagePath);
        const who =
          log.discordUserId != null
            ? `<@${log.discordUserId}>`
            : (log.displayName ?? "Member");

        const embed = new EmbedBuilder()
          .setColor(0x1f4d3a)
          .setTitle("Habit proof pending")
          .setDescription(
            [
              `**Action:** ${log.actionName}`,
              `**Member:** ${who}`,
              log.note ? `**Note:** ${log.note}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .setFooter({ text: `Log ${log.id}` });

        if (imageUrl) {
          embed.setImage(imageUrl);
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`${APPROVE_PREFIX}${log.id}`)
            .setLabel("Approve")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`${REJECT_PREFIX}${log.id}`)
            .setLabel("Reject")
            .setStyle(ButtonStyle.Danger),
        );

        const message = await channel.send({ embeds: [embed], components: [row] });
        await attachHabitDiscordMessage({
          id: log.id,
          channelId,
          messageId: message.id,
        });
        break;
      }
    }
  } catch (error) {
    console.error("Habit challenge worker failed:", error);
  } finally {
    running = false;
  }
}

export function startHabitChallengeWorker(client: Client): void {
  if (interval) {
    return;
  }
  interval = setInterval(() => {
    void processPending(client);
  }, POLL_MS);
  interval.unref?.();
  void processPending(client);
}

export async function handleHabitChallengeButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const parsed = parseHabitButtonCustomId(interaction.customId);
  if (!parsed) {
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.editReply({ content: "Guild only." });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) {
    await interaction.editReply({ content: "Could not resolve your membership." });
    return;
  }

  const settings = await getGuildSettings(interaction.guild.id);
  const level = getMemberPermissionLevel(member, settings);
  if (!hasLevel(level, "mod")) {
    await interaction.editReply({
      content: "You need Mod+ bot permissions to verify habit proofs.",
    });
    return;
  }

  const updated = await resolveHabitLogFromDiscord({
    id: parsed.logId,
    status: parsed.action === "approve" ? "verified" : "rejected",
  });

  if (!updated) {
    await interaction.editReply({
      content: "That log was already resolved.",
    });
    return;
  }

  const label = parsed.action === "approve" ? "Approved" : "Rejected";
  await interaction.message
    .edit({
      content: `${label} by <@${interaction.user.id}>`,
      components: [],
    })
    .catch(() => undefined);

  await interaction.editReply({ content: `${label} habit log.` });
}
