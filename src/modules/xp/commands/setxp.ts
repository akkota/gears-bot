import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requirePermission } from "../../../shared/permissions.js";
import { applyXpChange } from "../services/xpService.js";

export const setxpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("setxp")
    .setDescription("Set a member's XP to an exact amount.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member to update.").setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("New XP total.")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(10_000_000),
    ),
  async execute(interaction) {
    await interaction.deferReply();

    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.editReply({
        content: "This command can only be used in a server.",
      });
      return;
    }

    if (!(await requirePermission(interaction, "srmod"))) {
      return;
    }

    const user = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const result = await applyXpChange({
      guild: interaction.guild,
      member,
      userId: user.id,
      nextXp: amount,
    });

    const lines = [
      `Set <@${user.id}> to **${result.xp.toLocaleString()}** XP (**Level ${result.level}**)${
        result.currentRank ? ` · ${result.currentRank.name}` : ""
      }.`,
    ];
    if (result.unlockMessage) {
      lines.push(result.unlockMessage);
    }

    await interaction.editReply({ content: lines.join("\n") });
  },
};
