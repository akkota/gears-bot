import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";
import {
  channelExistsInGuild,
} from "../../../shared/discordChecks.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requireOwnerOrConfiguredAdmin } from "../../../shared/permissions.js";
import { setLogChannel } from "../services/guildSettingsService.js";

export const setLogChannelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("set-log-channel")
    .setDescription("Set the channel where setup and moderation logs are sent.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to receive bot logs.")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const permissionContext = await requireOwnerOrConfiguredAdmin(interaction);
    if (!permissionContext) {
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
    const channelExists = await channelExistsInGuild(
      permissionContext.guild,
      channel.id,
    );

    if (!channelExists) {
      await interaction.editReply({
        content: "The selected channel no longer exists in this server.",
      });
      return;
    }

    await setLogChannel(permissionContext.guild, channel.id, interaction.user);

    await interaction.editReply({
      content: `Log channel set to <#${channel.id}>.`,
    });
  },
};
