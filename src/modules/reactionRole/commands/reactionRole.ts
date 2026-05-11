import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requirePermission } from "../../../shared/permissions.js";
import { parseMessageId } from "../services/validateMessageId.js";
import { setupReactionRoleMessage } from "../services/reactionRoleService.js";

export const reactionRoleCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("reaction-role")
    .setDescription("Manage reaction role panels.")
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription(
          "Register an existing message in this channel as a reaction role panel.",
        )
        .addStringOption((option) =>
          option
            .setName("message_id")
            .setDescription(
              "The ID of the message in this channel (right-click the message → Copy Message ID).",
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("title")
            .setDescription("Optional label for this reaction role panel.")
            .setRequired(false)
            .setMaxLength(100),
        ),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.editReply({
        content: "This command can only be used in a server.",
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "setup") {
      if (!(await requirePermission(interaction, "admin"))) {
        return;
      }

      const rawMessageId = interaction.options.getString("message_id", true);
      const messageId = parseMessageId(rawMessageId);

      if (!messageId) {
        await interaction.editReply({
          content:
            "That doesn't look like a valid Discord message ID. Message IDs are long numbers (at least 17 digits). Right-click a message and choose **Copy Message ID** to get the correct value.",
        });
        return;
      }

      if (!interaction.channel || !interaction.channel.isTextBased()) {
        await interaction.editReply({
          content: "This command must be run in a text channel.",
        });
        return;
      }

      const message = await interaction.channel.messages
        .fetch(messageId)
        .catch(() => null);

      if (!message) {
        await interaction.editReply({
          content:
            "Could not find that message in this channel. Make sure the ID belongs to a message in the current channel.",
        });
        return;
      }

      const title =
        interaction.options.getString("title", false) ?? null;

      const result = await setupReactionRoleMessage({
        guild: interaction.guild,
        channel: interaction.channel,
        messageId,
        title,
        actor: interaction.user,
      });

      if (!result.ok) {
        await interaction.editReply({ content: result.errorMessage });
        return;
      }

      await interaction.editReply({
        content: `Reaction role panel registered for message \`${messageId}\`${title ? ` (${title})` : ""}.`,
      });
    }
  },
};
