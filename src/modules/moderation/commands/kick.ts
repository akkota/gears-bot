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
import { persistKick, sendKickLogIfConfigured } from "../services/kickService.js";

export const kickCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to kick.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why this kick is being applied.")
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

    if (!actor.permissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.editReply({
        content: "You need the Discord Kick Members permission to use /kick.",
      });
      return;
    }

    if (!botMember.permissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.editReply({
        content: "I need the Discord Kick Members permission to run /kick.",
      });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!targetMember) {
      await interaction.editReply({
        content: "Could not resolve that user as a member of this server.",
      });
      return;
    }

    const actorHierarchy = checkActorVsTargetHierarchy({
      guild: interaction.guild,
      actor,
      target: targetMember,
      actionName: "kick",
    });

    if (!actorHierarchy.ok) {
      await interaction.editReply({
        content: actorHierarchy.errorMessage ?? "You cannot kick this member.",
      });
      return;
    }

    const botHierarchy = checkBotVsTargetHierarchy({
      guild: interaction.guild,
      botMember,
      target: targetMember,
      actionName: "kick",
    });

    if (!botHierarchy.ok) {
      await interaction.editReply({
        content:
          botHierarchy.errorMessage ??
          "I cannot kick this member due to role hierarchy.",
      });
      return;
    }

    const reason = interaction.options.getString("reason", false) ?? null;
    const kickReason = reason
      ? `Kicked by ${interaction.user.tag}: ${reason}`
      : `Kicked by ${interaction.user.tag}`;

    const kicked = await targetMember.kick(kickReason).then(() => true).catch(() => false);

    if (!kicked) {
      await interaction.editReply({
        content: "Failed to kick that member.",
      });
      return;
    }

    const persisted = await persistKick({
      guild: interaction.guild,
      targetMember,
      moderator: interaction.user,
      reason,
    });

    await sendKickLogIfConfigured({
      guild: interaction.guild,
      moderator: interaction.user,
      targetMember,
      reason,
      caseId: persisted.caseId,
    });

    await interaction.editReply({
      content: `Kicked ${targetMember.user.tag}.`,
    });
  },
};
