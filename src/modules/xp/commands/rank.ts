import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { getXpSnapshot, loadLadder } from "../services/xpService.js";
import { buildRankEmbed } from "../services/rankUi.js";

export const rankCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Show your level, current rank, and progress to the next role.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member to inspect.")
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

    const target = interaction.options.getUser("user", false) ?? interaction.user;
    const [snapshot, ranks] = await Promise.all([
      getXpSnapshot(interaction.guild.id, target.id),
      loadLadder(interaction.guild.id),
    ]);

    const embed = buildRankEmbed({
      displayName: target.displayName,
      avatarUrl: target.displayAvatarURL({ size: 256 }),
      xp: snapshot.xp,
      ranks,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
