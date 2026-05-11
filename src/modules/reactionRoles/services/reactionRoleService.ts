import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildMember,
  type Role,
} from "discord.js";
import {
  createReactionRoleMessage,
  createReactionRoleOption,
  deactivateReactionRoleMessage,
  getReactionRoleMessageByGuildAndMessageId,
  getReactionRoleMessageById,
  getReactionRoleOption,
  listReactionRoleOptions,
  type ReactionRoleMessageRecord,
  type ReactionRoleOptionRecord,
} from "../../../db/reactionRolesRepo.js";
import { isSendableTextChannel } from "../../../shared/discordChecks.js";

const CUSTOM_ID_PREFIX = "rr:toggle:";
const MAX_OPTIONS = 25;

export class ReactionRoleSetupError extends Error {}

function buildPanelEmbed(
  panel: ReactionRoleMessageRecord,
  options: ReactionRoleOptionRecord[],
): EmbedBuilder {
  const lines = options.length
    ? options.map((item) => `<@&${item.roleId}> - ${item.label}`)
    : ["No roles added yet."];

  return new EmbedBuilder()
    .setColor(0x2563eb)
    .setTitle(panel.title ?? "Choose Your Roles")
    .setDescription(panel.description ?? "Click a button to toggle a role.")
    .addFields({
      name: "Available Roles",
      value: lines.join("\n"),
    });
}

function buttonCustomId(panelId: string, roleId: string): string {
  return `${CUSTOM_ID_PREFIX}${panelId}:${roleId}`;
}

export function parseReactionRoleCustomId(
  customId: string,
): { panelId: string; roleId: string } | null {
  if (!customId.startsWith(CUSTOM_ID_PREFIX)) {
    return null;
  }

  const payload = customId.slice(CUSTOM_ID_PREFIX.length);
  const splitAt = payload.indexOf(":");
  if (splitAt <= 0) {
    return null;
  }

  const panelId = payload.slice(0, splitAt);
  const roleId = payload.slice(splitAt + 1);
  if (!panelId || !roleId) {
    return null;
  }

  return { panelId, roleId };
}

function buildPanelButtons(
  panelId: string,
  options: ReactionRoleOptionRecord[],
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let index = 0; index < options.length; index += 5) {
    const chunk = options.slice(index, index + 5);
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const option of chunk) {
      const button = new ButtonBuilder()
        .setCustomId(buttonCustomId(panelId, option.roleId))
        .setLabel(option.label)
        .setStyle(ButtonStyle.Secondary);

      if (option.emoji) {
        button.setEmoji(option.emoji);
      }

      row.addComponents(button);
    }

    rows.push(row);
  }

  return rows;
}

async function ensureBotCanManageRoles(guild: Guild): Promise<GuildMember> {
  const botMember =
    guild.members.me ??
    (await guild.members.fetch(guild.client.user.id).catch(() => null));

  if (!botMember) {
    throw new ReactionRoleSetupError(
      "Could not resolve bot permissions for this server.",
    );
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new ReactionRoleSetupError(
      "I need the Discord Manage Roles permission to manage reaction roles.",
    );
  }

  return botMember;
}

function assertManageableRoleForPanel(role: Role, botMember: GuildMember): void {
  if (role.id === role.guild.id) {
    throw new ReactionRoleSetupError("Cannot configure @everyone as a reaction role.");
  }

  if (role.managed) {
    throw new ReactionRoleSetupError(
      "Cannot configure a managed or integration role for reaction roles.",
    );
  }

  if (role.comparePositionTo(botMember.roles.highest) >= 0) {
    throw new ReactionRoleSetupError(
      "I cannot manage that role because it is above or equal to my highest role.",
    );
  }
}

export async function createReactionRolePanel(params: {
  interaction: ChatInputCommandInteraction;
  channelId: string;
  title: string;
  description: string | null;
}): Promise<{ messageId: string; channelId: string }> {
  const guild = params.interaction.guild;
  if (!guild) {
    throw new ReactionRoleSetupError("This command can only be used in a server.");
  }

  await ensureBotCanManageRoles(guild);

  const channel = await guild.channels.fetch(params.channelId).catch(() => null);
  if (!isSendableTextChannel(channel) || !("messages" in channel)) {
    throw new ReactionRoleSetupError(
      "Selected channel does not support sending reaction role panels.",
    );
  }

  const sent = await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2563eb)
        .setTitle(params.title)
        .setDescription(params.description ?? "Click a button to toggle a role.")
        .addFields({ name: "Available Roles", value: "No roles added yet." }),
    ],
  });

  await createReactionRoleMessage({
    guildId: guild.id,
    guildName: guild.name,
    guildIconUrl: guild.iconURL(),
    guildOwnerId: guild.ownerId ?? null,
    channelId: channel.id,
    messageId: sent.id,
    title: params.title,
    description: params.description,
    createdByUserId: params.interaction.user.id,
  });

  return {
    messageId: sent.id,
    channelId: channel.id,
  };
}

export async function addReactionRolePanelOption(params: {
  interaction: ChatInputCommandInteraction;
  messageId: string;
  role: Role;
  label: string;
  emoji: string | null;
  description: string | null;
}): Promise<void> {
  const guild = params.interaction.guild;
  if (!guild) {
    throw new ReactionRoleSetupError("This command can only be used in a server.");
  }

  const botMember = await ensureBotCanManageRoles(guild);
  assertManageableRoleForPanel(params.role, botMember);

  const panel = await getReactionRoleMessageByGuildAndMessageId(
    guild.id,
    params.messageId,
  );

  if (!panel || !panel.active) {
    throw new ReactionRoleSetupError(
      "No active reaction role panel found for that message ID.",
    );
  }

  const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
  if (!isSendableTextChannel(channel) || !("messages" in channel)) {
    throw new ReactionRoleSetupError(
      "Panel channel no longer exists or is not a text channel.",
    );
  }

  const panelMessage = await channel.messages.fetch(panel.messageId).catch(() => null);
  if (!panelMessage) {
    await deactivateReactionRoleMessage(panel.id).catch(() => undefined);
    throw new ReactionRoleSetupError(
      "Panel message no longer exists. The panel was deactivated.",
    );
  }

  const existingOptions = await listReactionRoleOptions(panel.id);
  if (existingOptions.length >= MAX_OPTIONS) {
    throw new ReactionRoleSetupError("This panel already has the maximum of 25 roles.");
  }

  const nextSort =
    existingOptions.length === 0
      ? 0
      : Math.max(...existingOptions.map((item) => item.sortOrder)) + 1;

  try {
    await createReactionRoleOption({
      reactionRoleMessageId: panel.id,
      roleId: params.role.id,
      label: params.label,
      description: params.description,
      emoji: params.emoji,
      sortOrder: nextSort,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    if (message.includes("reaction_role_message_id,role_id")) {
      throw new ReactionRoleSetupError("That role is already configured on this panel.");
    }

    throw error;
  }

  const options = await listReactionRoleOptions(panel.id);
  const components = buildPanelButtons(panel.id, options);

  await panelMessage.edit({
    embeds: [buildPanelEmbed(panel, options)],
    components,
  });
}

export async function handleReactionRoleButtonToggle(
  interaction: ButtonInteraction,
): Promise<void> {
  const parsed = parseReactionRoleCustomId(interaction.customId);
  if (!parsed) {
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.editReply({
      content: "This button can only be used in a server.",
    });
    return;
  }

  const panel = await getReactionRoleMessageById(parsed.panelId);
  if (!panel || !panel.active) {
    await interaction.editReply({
      content: "This reaction role panel is no longer active.",
    });
    return;
  }

  if (panel.guildId !== interaction.guild.id || panel.messageId !== interaction.message.id) {
    await interaction.editReply({
      content: "This reaction role mapping is invalid for this server/message.",
    });
    return;
  }

  const mapping = await getReactionRoleOption(panel.id, parsed.roleId);
  if (!mapping) {
    await interaction.editReply({
      content: "This role option no longer exists on the panel.",
    });
    return;
  }

  const botMember = await ensureBotCanManageRoles(interaction.guild);

  const role = await interaction.guild.roles.fetch(mapping.roleId).catch(() => null);
  if (!role) {
    await interaction.editReply({
      content: "That role no longer exists. Ask an admin to update the panel.",
    });
    return;
  }

  if (role.managed || role.comparePositionTo(botMember.roles.highest) >= 0) {
    await interaction.editReply({
      content:
        "I cannot assign this role because it is managed or above my highest role.",
    });
    return;
  }

  const member = await interaction.guild.members
    .fetch(interaction.user.id)
    .catch(() => null);

  if (!member) {
    await interaction.editReply({
      content: "Could not resolve your server membership.",
    });
    return;
  }

  if (member.roles.cache.has(role.id)) {
    const removed = await member.roles.remove(role).then(() => true).catch(() => false);
    if (!removed) {
      await interaction.editReply({
        content: "Failed to remove role. Please try again.",
      });
      return;
    }

    await interaction.editReply({
      content: `Removed role <@&${role.id}>.`,
    });
    return;
  }

  const added = await member.roles.add(role).then(() => true).catch(() => false);
  if (!added) {
    await interaction.editReply({
      content: "Failed to add role. Please try again.",
    });
    return;
  }

  await interaction.editReply({
    content: `Added role <@&${role.id}>.`,
  });
}
