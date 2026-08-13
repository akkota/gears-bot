import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { channelExistsInGuild } from "../../../shared/discordChecks.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requireOwnerOrConfiguredAdmin } from "../../../shared/permissions.js";
import {
  addRepeatMessage,
  formatInterval,
  listGuildRepeatMessages,
  removeRepeatMessage,
  RepeatServiceError,
} from "../services/repeatService.js";

export const repeatCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("repeat")
    .setDescription("Schedule a message to post on an interval.")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a repeating message.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to post in.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        )
        .addStringOption((option) =>
          option
            .setName("interval")
            .setDescription("How often, like 10m, 1h, or 1d.")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Message to repeat.")
            .setRequired(true)
            .setMaxLength(1900),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List repeating messages in this server."),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a repeating message by id.")
        .addStringOption((option) =>
          option.setName("id").setDescription("Repeat id from /repeat list.").setRequired(true),
        ),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const permissionContext = await requireOwnerOrConfiguredAdmin(interaction);
    if (!permissionContext) {
      return;
    }

    const guild = permissionContext.guild;
    const subcommand = interaction.options.getSubcommand(true);

    try {
      if (subcommand === "list") {
        const items = await listGuildRepeatMessages(guild.id);
        if (items.length === 0) {
          await interaction.editReply({ content: "No repeating messages yet." });
          return;
        }

        const lines = items.map((item) => {
          const preview =
            item.content.length > 80 ? `${item.content.slice(0, 77)}...` : item.content;
          return `• \`${item.id}\` — <#${item.channelId}> every ${formatInterval(item.intervalMs)}\n  ${preview}`;
        });
        await interaction.editReply({ content: lines.join("\n") });
        return;
      }

      if (subcommand === "remove") {
        const id = interaction.options.getString("id", true);
        const removed = await removeRepeatMessage(guild.id, id);
        await interaction.editReply({
          content: removed ? "Removed that repeating message." : "No repeating message matched that id.",
        });
        return;
      }

      const channel = interaction.options.getChannel("channel", true);
      const interval = interaction.options.getString("interval", true);
      const message = interaction.options.getString("message", true);
      const exists = await channelExistsInGuild(guild, channel.id);
      if (!exists) {
        await interaction.editReply({
          content: "The selected channel no longer exists in this server.",
        });
        return;
      }

      const created = await addRepeatMessage({
        guild,
        channelId: channel.id,
        content: message,
        intervalInput: interval,
        createdBy: interaction.user.id,
      });
      await interaction.editReply({
        content: `Repeating in <#${channel.id}> every ${formatInterval(created.intervalMs)}.\nId: \`${created.id}\``,
      });
    } catch (error) {
      if (error instanceof RepeatServiceError) {
        await interaction.editReply({ content: error.message });
        return;
      }
      throw error;
    }
  },
};
