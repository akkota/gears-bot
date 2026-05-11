import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { buildServerInfoEmbed } from "../services/infoService.js";

export const serverinfoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("View details about this server."),
  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = await buildServerInfoEmbed(interaction.guild);

    await interaction.reply({
      embeds: [embed],
    });
  },
};
