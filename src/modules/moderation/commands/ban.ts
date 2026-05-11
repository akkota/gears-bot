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
  parseUserIdInput,
  persistBan,
  sendBanLogIfConfigured,
} from "../services/banService.js";

export const banCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server by mention or user ID.")
    .addStringOption((option) =>
      option
        .setName("user_or_id")
        .setDescription("User mention or user ID to ban.")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("delete_message_days")
        .setDescription("Delete the user's message history from the last N days (0-7).")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why this ban is being applied.")
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

    if (!(await requirePermission(interaction, "srmod"))) {
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
        content: "You need the Discord Ban Members permission to use /ban.",
      });
      return;
    }

    if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.editReply({
        content: "I need the Discord Ban Members permission to run /ban.",
      });
      return;
    }

    const rawTarget = interaction.options.getString("user_or_id", true);
    const targetUserId = parseUserIdInput(rawTarget);

    if (!targetUserId) {
      await interaction.editReply({
        content: "Provide a valid user mention or numeric user ID.",
      });
      return;
    }

    const deleteMessageDays =
      interaction.options.getInteger("delete_message_days", false) ?? 0;
    const reason = interaction.options.getString("reason", false) ?? null;

    const targetMember = await interaction.guild.members
      .fetch(targetUserId)
      .catch(() => null);

    if (targetMember) {
      const actorHierarchy = checkActorVsTargetHierarchy({
        guild: interaction.guild,
        actor,
        target: targetMember,
        actionName: "ban",
      });

      if (!actorHierarchy.ok) {
        await interaction.editReply({
          content: actorHierarchy.errorMessage ?? "You cannot ban this member.",
        });
        return;
      }

      const botHierarchy = checkBotVsTargetHierarchy({
        guild: interaction.guild,
        botMember,
        target: targetMember,
        actionName: "ban",
      });

      if (!botHierarchy.ok) {
        await interaction.editReply({
          content:
            botHierarchy.errorMessage ??
            "I cannot ban this member due to role hierarchy.",
        });
        return;
      }
    }

    const banReason = reason
      ? `Banned by ${interaction.user.tag}: ${reason}`
      : `Banned by ${interaction.user.tag}`;

    const banned = await interaction.guild.members
      .ban(targetUserId, {
        reason: banReason,
        deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
      })
      .then(() => true)
      .catch(() => false);

    if (!banned) {
      await interaction.editReply({
        content: "Failed to ban that user.",
      });
      return;
    }

    const persisted = await persistBan({
      guild: interaction.guild,
      targetUserId,
      moderator: interaction.user,
      reason,
      deleteMessageDays,
      targetInGuild: Boolean(targetMember),
    });

    const targetLabel =
      targetMember?.user.tag ??
      (await interaction.client.users
        .fetch(targetUserId)
        .then((user) => user.tag)
        .catch(() => "Unknown User"));

    await sendBanLogIfConfigured({
      guild: interaction.guild,
      moderator: interaction.user,
      targetLabel,
      targetUserId,
      reason,
      deleteMessageDays,
      caseId: persisted.caseId,
    });

    await interaction.editReply({
      content: `Banned ${targetLabel} (${targetUserId}).`,
    });
  },
};
