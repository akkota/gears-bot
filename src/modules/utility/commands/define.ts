import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import {
  lookupDefinition,
  normalizeDictionaryWord,
  summarizeDefinitions,
} from "../services/defineService.js";

export const defineCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("define")
    .setDescription("Look up a dictionary definition for a word.")
    .addStringOption((option) =>
      option
        .setName("word")
        .setDescription("Word to define.")
        .setRequired(true)
        .setMaxLength(64),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const inputWord = interaction.options.getString("word", true);
    const word = normalizeDictionaryWord(inputWord);

    if (!word) {
      await interaction.editReply({
        content: "Please provide a valid word to define.",
      });
      return;
    }

    const result = await lookupDefinition(word);

    if (result.status === "not_found") {
      await interaction.editReply({
        content: `No definition found for \`${word}\`.`,
      });
      return;
    }

    if (result.status === "error") {
      await interaction.editReply({
        content:
          "Dictionary service is temporarily unavailable. Please try again in a moment.",
      });
      return;
    }

    await interaction.editReply({
      content: summarizeDefinitions(result).join("\n"),
    });
  },
};
