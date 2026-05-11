import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is online."),
  async execute(interaction) {
    await interaction.reply({
      content: "Pong!",
      flags: MessageFlags.Ephemeral,
    });
  },
};
