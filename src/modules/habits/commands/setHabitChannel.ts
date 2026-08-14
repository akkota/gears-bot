import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { upsertGuildSettings } from "../../../db/guildSettingsRepo.js";
import type { SlashCommand } from "../../../shared/command.js";
import { channelExistsInGuild } from "../../../shared/discordChecks.js";
import { requireOwnerOrConfiguredAdmin } from "../../../shared/permissions.js";

export const setHabitChannelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("set-habit-channel")
    .setDescription("Set the channel where website habit proofs are posted for approval.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Challenge verification channel.")
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
      { habitChallengeChannelId: channel.id },
    );

    await interaction.editReply({
      content: `Habit challenge channel set to <#${channel.id}>.`,
    });
  },
};
