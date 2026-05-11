import type {
  ChatInputCommandInteraction,
  Guild,
  GuildMember,
} from "discord.js";
import { MessageFlags } from "discord.js";
import type { GuildSettings } from "../db/guildSettingsRepo.js";
import {
  getInteractionContext,
  hasDiscordAdministratorPermission,
  isGuildOwner,
} from "./discordChecks.js";
import { getGuildSettings } from "../db/guildSettingsRepo.js";

export const PERMISSION_LEVELS = [
  "everyone",
  "mod",
  "srmod",
  "admin",
  "discord_admin",
] as const;

export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

const permissionRank: Record<PermissionLevel, number> = {
  everyone: 0,
  mod: 1,
  srmod: 2,
  admin: 3,
  discord_admin: 4,
};

export function getPermissionRank(level: PermissionLevel): number {
  return permissionRank[level];
}

export function hasLevel(
  actual: PermissionLevel,
  requiredLevel: PermissionLevel,
): boolean {
  return getPermissionRank(actual) >= getPermissionRank(requiredLevel);
}

export function hasRequiredPermissionLevel(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel,
): boolean {
  return hasLevel(userLevel, requiredLevel);
}

export function getHigherPermissionLevel(
  left: PermissionLevel,
  right: PermissionLevel,
): PermissionLevel {
  return hasLevel(left, right) ? left : right;
}

export interface PermissionRoleConfig {
  adminRoleId: string | null;
  srmodRoleId: string | null;
  modRoleId: string | null;
}

export interface PermissionContext {
  isDiscordAdministrator: boolean;
  memberRoleIds: Iterable<string>;
  roleConfig: PermissionRoleConfig;
}

type SettingsRoleConfig = Pick<
  GuildSettings,
  "adminRoleId" | "srmodRoleId" | "modRoleId"
>;

export interface PermissionCheckContext {
  guild: Guild;
  member: GuildMember;
  settings: GuildSettings | null;
}

function mapSettingsToRoleConfig(
  settings: SettingsRoleConfig | null,
): PermissionRoleConfig {
  return {
    adminRoleId: settings?.adminRoleId ?? null,
    srmodRoleId: settings?.srmodRoleId ?? null,
    modRoleId: settings?.modRoleId ?? null,
  };
}

export function getMemberPermissionLevel(
  member: GuildMember,
  settings: SettingsRoleConfig | null,
): PermissionLevel {
  return resolvePermissionLevel({
    isDiscordAdministrator: hasDiscordAdministratorPermission(member),
    memberRoleIds: member.roles.cache.keys(),
    roleConfig: mapSettingsToRoleConfig(settings),
  });
}

export function resolvePermissionLevel(
  context: PermissionContext,
): PermissionLevel {
  if (context.isDiscordAdministrator) {
    return "discord_admin";
  }

  const memberRoles = new Set(context.memberRoleIds);

  if (context.roleConfig.adminRoleId && memberRoles.has(context.roleConfig.adminRoleId)) {
    return "admin";
  }

  if (context.roleConfig.srmodRoleId && memberRoles.has(context.roleConfig.srmodRoleId)) {
    return "srmod";
  }

  if (context.roleConfig.modRoleId && memberRoles.has(context.roleConfig.modRoleId)) {
    return "mod";
  }

  return "everyone";
}

function formatLevel(level: PermissionLevel): string {
  return level.toUpperCase();
}

async function sendEphemeralPermissionMessage(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  if (interaction.deferred) {
    await interaction.editReply({ content }).catch(() => undefined);
    return;
  }

  if (interaction.replied) {
    await interaction
      .followUp({ content, flags: MessageFlags.Ephemeral })
      .catch(() => undefined);
    return;
  }

  await interaction
    .reply({ content, flags: MessageFlags.Ephemeral })
    .catch(() => undefined);
}

async function loadPermissionCheckContext(
  interaction: ChatInputCommandInteraction,
): Promise<PermissionCheckContext | null> {
  const context = await getInteractionContext(interaction);

  if ("errorMessage" in context) {
    await sendEphemeralPermissionMessage(interaction, context.errorMessage);
    return null;
  }

  const settings = await getGuildSettings(context.guild.id);

  return {
    guild: context.guild,
    member: context.member,
    settings,
  };
}

export function hasConfiguredAdminRole(
  member: GuildMember,
  settings: SettingsRoleConfig | null,
): boolean {
  if (!settings?.adminRoleId) {
    return false;
  }

  return member.roles.cache.has(settings.adminRoleId);
}

export function isOwnerOrConfiguredAdmin(
  guild: Guild,
  member: GuildMember,
  settings: SettingsRoleConfig | null,
): boolean {
  if (isServerOwnerForAdminRoleConfig(guild, member)) {
    return true;
  }

  return hasConfiguredAdminRole(member, settings);
}

export function isServerOwnerForAdminRoleConfig(
  guild: Guild,
  member: GuildMember,
): boolean {
  return isGuildOwner(guild, member.id);
}

export async function requirePermission(
  interaction: ChatInputCommandInteraction,
  requiredLevel: PermissionLevel,
): Promise<boolean> {
  const permissionContext = await loadPermissionCheckContext(interaction);
  if (!permissionContext) {
    return false;
  }

  const actualLevel = getMemberPermissionLevel(
    permissionContext.member,
    permissionContext.settings,
  );

  if (hasLevel(actualLevel, requiredLevel)) {
    return true;
  }

  await sendEphemeralPermissionMessage(
    interaction,
    `You need bot permission level ${formatLevel(requiredLevel)} or higher to use /${interaction.commandName}. Your current level is ${formatLevel(actualLevel)}.`,
  );
  return false;
}

export async function requireOwner(
  interaction: ChatInputCommandInteraction,
): Promise<PermissionCheckContext | null> {
  const permissionContext = await loadPermissionCheckContext(interaction);
  if (!permissionContext) {
    return null;
  }

  if (isServerOwnerForAdminRoleConfig(permissionContext.guild, permissionContext.member)) {
    return permissionContext;
  }

  await sendEphemeralPermissionMessage(
    interaction,
    `Only the server owner can use /${interaction.commandName}.`,
  );
  return null;
}

export async function requireOwnerOrConfiguredAdmin(
  interaction: ChatInputCommandInteraction,
): Promise<PermissionCheckContext | null> {
  const permissionContext = await loadPermissionCheckContext(interaction);
  if (!permissionContext) {
    return null;
  }

  if (
    isOwnerOrConfiguredAdmin(
      permissionContext.guild,
      permissionContext.member,
      permissionContext.settings,
    )
  ) {
    return permissionContext;
  }

  await sendEphemeralPermissionMessage(
    interaction,
    `You must be the server owner or have the configured Admin role to use /${interaction.commandName}.`,
  );
  return null;
}
