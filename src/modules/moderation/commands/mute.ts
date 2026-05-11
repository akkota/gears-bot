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
import { persistVoiceMute, sendMuteLogIfConfigured } from "../services/muteService.js";

export const muteCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Voice-mute a member currently in a voice channel.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to voice-mute.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why this mute is being applied.")
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

    if (!(await requirePermission(interaction, "srmod"))) {
      return;
    }

    if (!actor.permissions.has(PermissionFlagsBits.MuteMembers)) {
      await interaction.editReply({
        content:
          "You need the Discord Mute Members permission to use /mute.",
      });
      return;
    }

    if (!botMember.permissions.has(PermissionFlagsBits.MuteMembers)) {
      await interaction.editReply({
        content: "I need the Discord Mute Members permission to run /mute.",
      });
      return;
    }

    if (!targetMember.voice.channelId) {
      await interaction.editReply({
        content: "That member is not currently connected to a voice channel.",
      });
      return;
    }

    const actorHierarchy = checkActorVsTargetHierarchy({
      guild: interaction.guild,
      actor,
      target: targetMember,
      actionName: "mute",
    });

    if (!actorHierarchy.ok) {
      await interaction.editReply({
        content: actorHierarchy.errorMessage ?? "You cannot mute this member.",
      });
      return;
    }

    const botHierarchy = checkBotVsTargetHierarchy({
      guild: interaction.guild,
      botMember,
      target: targetMember,
      actionName: "mute",
    });

    if (!botHierarchy.ok) {
      await interaction.editReply({
        content:
          botHierarchy.errorMessage ??
          "I cannot mute this member due to role hierarchy.",
      });
      return;
    }

    const reason = interaction.options.getString("reason", false) ?? null;
    const voiceReason = reason
      ? `Voice muted by ${interaction.user.tag}: ${reason}`
      : `Voice muted by ${interaction.user.tag}`;
    const voiceMuted = await targetMember.voice
      .setMute(true, voiceReason)
      .then(() => true)
      .catch(async () => {
        await interaction.editReply({
          content: "Failed to apply voice mute on that member.",
        });
        return false;
      });

    if (!voiceMuted) {
      return;
    }

    const persisted = await persistVoiceMute({
      guild: interaction.guild,
      targetMember,
      moderator: interaction.user,
      reason,
    });

    await sendMuteLogIfConfigured({
      guild: interaction.guild,
      moderator: interaction.user,
      targetMember,
      durationLabel: "Voice Mute",
      reason,
      caseId: persisted.caseId,
      expiresAt: null,
      type: "voice",
    });

    await interaction.editReply({
      content: `Voice-muted ${targetMember.user.tag}.`,
    });
  },
};
