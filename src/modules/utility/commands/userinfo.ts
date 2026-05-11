import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { buildUserInfoEmbed } from "../services/infoService.js";

export const userinfoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("View details about a user in this server.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to inspect.")
        .setRequired(false),
    ),
  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser("user", false) ?? interaction.user;
    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    const embed = buildUserInfoEmbed({
      user: targetUser,
      member: targetMember,
    });

    await interaction.reply({
      embeds: [embed],
    });
  },
};
