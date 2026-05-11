import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { buildRoleInfoEmbed } from "../services/infoService.js";

export const roleinfoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("roleinfo")
    .setDescription("View details about a server role.")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to inspect.")
        .setRequired(true),
    ),
  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const selectedRole = interaction.options.getRole("role", true);
    const role = await interaction.guild.roles.fetch(selectedRole.id).catch(() => null);

    if (!role) {
      await interaction.reply({
        content: "Could not resolve that role in this server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = buildRoleInfoEmbed(role);

    await interaction.reply({
      embeds: [embed],
    });
  },
};
