import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import {
  createGuildReminder,
  parseReminderTime,
  ReminderServiceError,
} from "../services/reminderService.js";

export const remindCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a reminder for yourself.")
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Relative time like 10m, 2h, or 3d.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("What should I remind you about?")
        .setRequired(true)
        .setMaxLength(400),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.inGuild() || !interaction.guild || !interaction.channel) {
      await interaction.editReply({
        content: "This command can only be used in a server text channel.",
      });
      return;
    }

    const timeInput = interaction.options.getString("time", true);
    const message = interaction.options.getString("message", true);

    try {
      const parsed = parseReminderTime(timeInput);
      const created = await createGuildReminder({
        guild: interaction.guild,
        channelId: interaction.channelId,
        user: interaction.user,
        reminderText: message,
        remindAt: parsed.remindAt,
      });

      const unix = Math.floor(created.remindAt.getTime() / 1000);
      await interaction.editReply({
        content: `Reminder set for <t:${unix}:F> (<t:${unix}:R>).`,
      });
      return;
    } catch (error) {
      if (error instanceof ReminderServiceError) {
        await interaction.editReply({ content: error.message });
        return;
      }

      console.error("Failed to create reminder:", error);
      await interaction.editReply({
        content: "Failed to create reminder. Please try again.",
      });
      return;
    }
  },
};
