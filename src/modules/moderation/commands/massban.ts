import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import {
  checkActorVsTargetHierarchy,
  checkBotVsTargetHierarchy,
} from "../../../shared/discordChecks.js";
import { requirePermission } from "../../../shared/permissions.js";
import {
  parseMassbanUserIds,
  persistMassBanCase,
  persistMassBanTargets,
  sendMassBanLogIfConfigured,
} from "../services/banService.js";

export const massbanCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("massban")
    .setDescription("Ban multiple users by ID.")
    .addStringOption((option) =>
      option
        .setName("user_ids")
        .setDescription("Comma- or space-separated user IDs (or mentions).")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why this massban is being applied.")
        .setRequired(false)
        .setMaxLength(300),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.editReply({
        content: "This command can only be used in a server.",
      });
      return;
    }

    if (!(await requirePermission(interaction, "admin"))) {
      return;
    }

    const actor = await interaction.guild.members
      .fetch(interaction.user.id)
      .catch(() => null);

    if (!actor) {
      await interaction.editReply({
        content: "Could not resolve your server membership.",
      });
      return;
    }

    const botMember =
      interaction.guild.members.me ??
      (await interaction.guild.members
        .fetch(interaction.client.user.id)
        .catch(() => null));

    if (!botMember) {
      await interaction.editReply({
        content: "Could not resolve bot permissions for this server.",
      });
      return;
    }

    if (!actor.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.editReply({
        content: "You need the Discord Ban Members permission to use /massban.",
      });
      return;
    }

    if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.editReply({
        content: "I need the Discord Ban Members permission to run /massban.",
      });
      return;
    }

    const rawIds = interaction.options.getString("user_ids", true);
    const parsed = parseMassbanUserIds(rawIds);

    if (parsed.validIds.length === 0) {
      await interaction.editReply({
        content:
          parsed.invalidEntries.length > 0
            ? `No valid user IDs provided. Invalid entries: ${parsed.invalidEntries.join(", ")}`
            : "No user IDs provided.",
      });
      return;
    }

    const reason = interaction.options.getString("reason", false) ?? null;

    const caseRecord = await persistMassBanCase({
      guild: interaction.guild,
      moderator: interaction.user,
      reason,
      requestedIds: parsed.validIds,
      invalidIds: parsed.invalidEntries,
    });

    const results: Array<{
      targetUserId: string;
      success: boolean;
      errorMessage: string | null;
    }> = [];

    for (const targetUserId of parsed.validIds) {
      const targetMember = await interaction.guild.members
        .fetch(targetUserId)
        .catch(() => null);

      if (targetMember) {
        const actorHierarchy = checkActorVsTargetHierarchy({
          guild: interaction.guild,
          actor,
          target: targetMember,
          actionName: "massban",
        });

        if (!actorHierarchy.ok) {
          results.push({
            targetUserId,
            success: false,
            errorMessage:
              actorHierarchy.errorMessage ??
              "Blocked by actor-vs-target role hierarchy.",
          });
          continue;
        }

        const botHierarchy = checkBotVsTargetHierarchy({
          guild: interaction.guild,
          botMember,
          target: targetMember,
          actionName: "massban",
        });

        if (!botHierarchy.ok) {
          results.push({
            targetUserId,
            success: false,
            errorMessage:
              botHierarchy.errorMessage ??
              "Blocked by bot-vs-target role hierarchy.",
          });
          continue;
        }
      }

      const banReason = reason
        ? `Massban by ${interaction.user.tag}: ${reason}`
        : `Massban by ${interaction.user.tag}`;

      const banSucceeded = await interaction.guild.members
        .ban(targetUserId, {
          reason: banReason,
          deleteMessageSeconds: 0,
        })
        .then(() => true)
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Failed to ban user.";
          results.push({
            targetUserId,
            success: false,
            errorMessage: message,
          });
          return false;
        });

      if (banSucceeded) {
        results.push({
          targetUserId,
          success: true,
          errorMessage: null,
        });
      }
    }

    for (const invalidEntry of parsed.invalidEntries) {
      results.push({
        targetUserId: invalidEntry,
        success: false,
        errorMessage: "Invalid user ID format.",
      });
    }

    await persistMassBanTargets({
      caseId: caseRecord.caseId,
      results,
    });

    const successCount = results.filter((row) => row.success).length;
    const failureCount = results.length - successCount;

    await sendMassBanLogIfConfigured({
      guild: interaction.guild,
      moderator: interaction.user,
      caseId: caseRecord.caseId,
      reason,
      requestedCount: parsed.validIds.length,
      invalidCount: parsed.invalidEntries.length,
      successCount,
      failureCount,
    });

    const invalidNote =
      parsed.invalidEntries.length > 0
        ? ` Invalid entries: ${parsed.invalidEntries.join(", ")}.`
        : "";

    await interaction.editReply({
      content: `Massban complete. Success: ${successCount}. Failed: ${failureCount}.${invalidNote}`,
    });
  },
};
