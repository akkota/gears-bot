import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { parseDateTimeToEpoch } from "../../../shared/time.js";

export const timestampCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("timestamp")
    .setDescription("Convert a date/time into Discord timestamp formats.")
    .addStringOption((option) =>
      option
        .setName("datetime")
        .setDescription(
          "Date/time (for example: 2026-05-11 18:30, 2026-05-11T18:30:00Z).",
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("timezone")
        .setDescription("Optional IANA timezone (for example: America/Los_Angeles).")
        .setRequired(false),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const datetime = interaction.options.getString("datetime", true);
    const timezone = interaction.options.getString("timezone", false);

    const parsed = parseDateTimeToEpoch(datetime, timezone ?? null);

    if (!parsed) {
      await interaction.editReply({
        content:
          "Invalid datetime input. Use an ISO datetime or `YYYY-MM-DD HH:mm[:ss]`. If you provide `timezone`, use a valid IANA timezone like `America/Los_Angeles`.",
      });
      return;
    }

    const epoch = parsed.epochSeconds;

    await interaction.editReply({
      content: [
        `Short time: <t:${epoch}:t>`,
        `Long date/time: <t:${epoch}:F>`,
        `Relative time: <t:${epoch}:R>`,
        `Raw epoch seconds: ${epoch}`,
      ].join("\n"),
    });
  },
};
