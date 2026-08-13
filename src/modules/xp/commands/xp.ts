import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { buildXpEmbed } from "../services/rankUi.js";
import { getXpSnapshot, loadLadder } from "../services/xpService.js";

export const xpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Check a member's XP and level.")
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

    const embed = buildXpEmbed({
      displayName: target.displayName,
      avatarUrl: target.displayAvatarURL({ size: 256 }),
      xp: snapshot.xp,
      ranks,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
