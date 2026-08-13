import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { channelExistsInGuild } from "../../../shared/discordChecks.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requireOwnerOrConfiguredAdmin } from "../../../shared/permissions.js";
import { upsertGuildSettings } from "../../../db/guildSettingsRepo.js";

export const setEmailChannelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("set-email-channel")
    .setDescription("Set the channel for ESW distribution-list email posts.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel that should receive list emails.")
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
    const exists = await channelExistsInGuild(permissionContext.guild, channel.id);
    if (!exists) {
      await interaction.editReply({
        content: "The selected channel no longer exists in this server.",
      });
      return;
    }

    await upsertGuildSettings(
      {
        guildId: permissionContext.guild.id,
        name: permissionContext.guild.name,
        iconUrl: permissionContext.guild.iconURL(),
        ownerId: permissionContext.guild.ownerId ?? null,
      },
      { emailAnnounceChannelId: channel.id },
    );

    await interaction.editReply({
      content: `Email announce channel set to <#${channel.id}>.`,
    });
  },
};
