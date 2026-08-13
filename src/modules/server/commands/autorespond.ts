import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requireOwnerOrConfiguredAdmin } from "../../../shared/permissions.js";
import {
  addAutoresponse,
  AutorespondServiceError,
  listGuildAutoresponses,
  removeAutoresponse,
} from "../services/autorespondService.js";

export const autorespondCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("autorespond")
    .setDescription("Auto-reply when a message contains a trigger.")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a trigger and reply.")
        .addStringOption((option) =>
          option
            .setName("trigger")
            .setDescription("Text to look for (case-insensitive).")
            .setRequired(true)
            .setMaxLength(100),
        )
        .addStringOption((option) =>
          option
            .setName("reply")
            .setDescription("What the bot should reply.")
            .setRequired(true)
            .setMaxLength(1900),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List autoresponses in this server."),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove an autoresponse by trigger or id.")
        .addStringOption((option) =>
          option.setName("trigger").setDescription("Trigger text to remove.").setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("id").setDescription("Id from /autorespond list.").setRequired(false),
        ),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const permissionContext = await requireOwnerOrConfiguredAdmin(interaction);
    if (!permissionContext) {
      return;
    }

    const guild = permissionContext.guild;
    const subcommand = interaction.options.getSubcommand(true);

    try {
      if (subcommand === "list") {
        const rules = await listGuildAutoresponses(guild.id);
        if (rules.length === 0) {
          await interaction.editReply({ content: "No autoresponses yet." });
          return;
        }

        const lines = rules.map((rule) => {
          const preview = rule.reply.length > 80 ? `${rule.reply.slice(0, 77)}...` : rule.reply;
          return `• \`${rule.id}\` — **${rule.trigger}**\n  ${preview}`;
        });
        await interaction.editReply({ content: lines.join("\n") });
        return;
      }

      if (subcommand === "remove") {
        const removed = await removeAutoresponse({
          guildId: guild.id,
          id: interaction.options.getString("id", false) ?? undefined,
          trigger: interaction.options.getString("trigger", false) ?? undefined,
        });
        await interaction.editReply({
          content: removed ? "Removed that autoresponse." : "No matching autoresponse found.",
        });
        return;
      }

      const created = await addAutoresponse({
        guild,
        trigger: interaction.options.getString("trigger", true),
        reply: interaction.options.getString("reply", true),
        createdBy: interaction.user.id,
      });
      await interaction.editReply({
        content: `I'll reply when a message contains **${created.trigger}**.`,
      });
    } catch (error) {
      if (error instanceof AutorespondServiceError) {
        await interaction.editReply({ content: error.message });
        return;
      }
      throw error;
    }
  },
};
