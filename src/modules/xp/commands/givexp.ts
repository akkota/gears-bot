import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requirePermission } from "../../../shared/permissions.js";
import { addXp } from "../services/xpService.js";

export const givexpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("givexp")
    .setDescription("Give XP to a member.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Member who should receive XP.").setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("XP to add.")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1_000_000),
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

    const result = await addXp({
      guild: interaction.guild,
      member,
      userId: user.id,
      amount,
    });

    const lines = [
      `Gave **${amount}** XP to <@${user.id}>.`,
      `They are now **Level ${result.level}** (${result.xp.toLocaleString()} XP)${
        result.currentRank ? ` · ${result.currentRank.name}` : ""
      }.`,
    ];
    if (result.unlockMessage) {
      lines.push(result.unlockMessage);
    }

    await interaction.editReply({ content: lines.join("\n") });
  },
};
