import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { presentGarden } from "../../garden/services/gardenPresent.js";
import { getXpSnapshot, loadLadder } from "../services/xpService.js";

export const rankCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Show your garden, level, and progress to the next role.")
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

    await interaction.deferReply();
    const target = interaction.options.getUser("user", false) ?? interaction.user;
    const [snapshot, ranks] = await Promise.all([
      getXpSnapshot(interaction.guild.id, target.id),
      loadLadder(interaction.guild.id),
    ]);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    const presented = await presentGarden({
      guildId: interaction.guild.id,
      ownerId: target.id,
      displayName: member?.displayName ?? target.displayName,
      xp: snapshot.xp,
      level: snapshot.level,
      ranks,
      self: target.id === interaction.user.id,
    });

    await interaction.editReply({
      embeds: presented.embeds,
      files: presented.files,
      components: presented.components,
    });
  },
};
