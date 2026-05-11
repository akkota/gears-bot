import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../../shared/command.js";
import { requirePermission } from "../../../shared/permissions.js";
import {
  getPurgeEligibleChannel,
  persistPurgeSummary,
  sendPurgeLogIfConfigured,
} from "../services/purgeService.js";

export const purgeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk delete recent messages in the current channel.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of messages to delete (1-100).")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Only delete messages from this user.")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why this purge is being run.")
        .setRequired(false)
        .setMaxLength(300),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await requirePermission(interaction, "mod"))) {
      return;
    }

    if (!interaction.inGuild() || !interaction.guild || !interaction.member) {
      await interaction.editReply({
        content: "This command can only be used in a server.",
      });
      return;
    }

    const invokerMember = await interaction.guild.members
      .fetch(interaction.user.id)
      .catch(() => null);

    if (!invokerMember) {
      await interaction.editReply({
        content: "Could not resolve your server membership.",
      });
      return;
    }

    if (!invokerMember.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.editReply({
        content:
          "You need the Discord Manage Messages permission to use /purge.",
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

    if (!botMember.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.editReply({
        content:
          "I need the Discord Manage Messages permission to run /purge.",
      });
      return;
    }

    const amount = interaction.options.getInteger("amount", true);
    if (amount < 1 || amount > 100) {
      await interaction.editReply({
        content: "Amount must be between 1 and 100.",
      });
      return;
    }

    const filterUser = interaction.options.getUser("user", false);
    const reason = interaction.options.getString("reason", false);

    const purgeChannel = getPurgeEligibleChannel(interaction.channel);
    if (!purgeChannel) {
      await interaction.editReply({
        content:
          "This channel type does not support bulk message deletion.",
      });
      return;
    }

    const fetched = await purgeChannel.messages.fetch({ limit: 100 });
    const filtered = filterUser
      ? fetched.filter((message) => message.author.id === filterUser.id)
      : fetched;
    const toDelete = filtered.first(amount);

    if (toDelete.length === 0) {
      await interaction.editReply({
        content: filterUser
          ? "No recent messages found for that user."
          : "No recent messages found to delete.",
      });
      return;
    }

    const deleted = await purgeChannel
      .bulkDelete(toDelete, true)
      .catch(() => null);

    if (!deleted || deleted.size === 0) {
      await interaction.editReply({
        content:
          "No messages were deleted. Messages older than 14 days cannot be bulk deleted.",
      });
      return;
    }

    const persisted = await persistPurgeSummary({
      guild: interaction.guild,
      channelId: purgeChannel.id,
      moderator: interaction.user,
      amountRequested: amount,
      amountDeleted: deleted.size,
      filterUserId: filterUser?.id ?? null,
      reason: reason ?? null,
    });

    await sendPurgeLogIfConfigured({
      guild: interaction.guild,
      moderator: interaction.user,
      channelId: purgeChannel.id,
      amountRequested: amount,
      amountDeleted: deleted.size,
      filterUserId: filterUser?.id ?? null,
      reason: reason ?? null,
      caseId: persisted.caseId,
    });

    const partialNote =
      deleted.size < toDelete.length
        ? " Some messages may have been skipped because they are too old."
        : "";

    await interaction.editReply({
      content: `Deleted ${deleted.size} message(s).${partialNote}`,
    });
  },
};
