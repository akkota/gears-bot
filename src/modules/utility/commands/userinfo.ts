import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { getCurrentRank } from "../../xp/services/rankLadder.js";
import { getXpSnapshot, loadLadder } from "../../xp/services/xpService.js";
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

    let level: number | undefined;
    let rankName: string | null | undefined;
    if (targetMember) {
      const snapshot = await getXpSnapshot(interaction.guild.id, targetUser.id);
      if (snapshot.record) {
        const ladder = await loadLadder(interaction.guild.id);
        level = snapshot.level;
        rankName = getCurrentRank(snapshot.level, ladder)?.name ?? null;
      }
    }

    const embed = buildUserInfoEmbed({
      user: targetUser,
      member: targetMember,
      level,
      rankName,
    });

    await interaction.reply({
      embeds: [embed],
    });
  },
};
