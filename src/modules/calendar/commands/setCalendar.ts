import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { upsertGuildSettings } from "../../../db/guildSettingsRepo.js";
import type { SlashCommand } from "../../../shared/command.js";
import { channelExistsInGuild } from "../../../shared/discordChecks.js";
import { requireOwnerOrConfiguredAdmin } from "../../../shared/permissions.js";

export const setCalendarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("set-calendar")
    .setDescription("Connect a Google Calendar so events sync to Discord.")
    .addStringOption((option) =>
      option
        .setName("calendar_id")
        .setDescription("Google Calendar ID (often an email-style address).")
        .setRequired(true)
        .setMaxLength(200),
    )
    .addChannelOption((option) =>
      option
        .setName("announce_channel")
        .setDescription("Optional channel for new-event announcements.")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const permissionContext = await requireOwnerOrConfiguredAdmin(interaction);
    if (!permissionContext) {
      return;
    }

    const calendarId = interaction.options.getString("calendar_id", true).trim();
    if (!calendarId) {
      await interaction.editReply({
        content: "Provide a valid Google Calendar ID.",
      });
      return;
    }

    const announceChannel = interaction.options.getChannel("announce_channel", false);
    if (announceChannel) {
      const exists = await channelExistsInGuild(
        permissionContext.guild,
        announceChannel.id,
      );
      if (!exists) {
        await interaction.editReply({
          content: "The selected announce channel no longer exists in this server.",
        });
        return;
      }
    }

    await upsertGuildSettings(
      {
        guildId: permissionContext.guild.id,
        name: permissionContext.guild.name,
        iconUrl: permissionContext.guild.iconURL(),
        ownerId: permissionContext.guild.ownerId ?? null,
      },
      {
        googleCalendarId: calendarId,
        calendarAnnounceChannelId: announceChannel?.id ?? null,
      },
    );

    await interaction.editReply({
      content: announceChannel
        ? `Google Calendar \`${calendarId}\` will sync to Discord events. New events will also be announced in <#${announceChannel.id}>.`
        : `Google Calendar \`${calendarId}\` will sync to Discord events.`,
    });
  },
};
