import {
  type ChatInputCommandInteraction,
  type Guild,
  type GuildBasedChannel,
  type GuildMember,
  type Role,
  PermissionFlagsBits,
} from "discord.js";

export interface InteractionContext {
  guild: Guild;
  member: GuildMember;
}

export interface InteractionContextError {
  errorMessage: string;
}

export async function getInteractionContext(
  interaction: ChatInputCommandInteraction,
): Promise<InteractionContext | InteractionContextError> {
  if (!interaction.inGuild() || !interaction.guild) {
    return { errorMessage: "This command can only be used in a server." };
  }

  const member = await interaction.guild.members
    .fetch(interaction.user.id)
    .catch(() => null);

  if (!member) {
    return { errorMessage: "Could not resolve your server membership." };
  }

  return {
    guild: interaction.guild,
    member,
  };
}

export function hasDiscordAdministratorPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

export function isGuildOwner(guild: Guild, userId: string): boolean {
  return guild.ownerId === userId;
}

export async function roleExistsInGuild(
  guild: Guild,
  roleId: string,
): Promise<boolean> {
  const role = await fetchGuildRole(guild, roleId);
  return Boolean(role);
}

export async function channelExistsInGuild(
  guild: Guild,
  channelId: string,
): Promise<boolean> {
  const channel = await fetchGuildChannel(guild, channelId);
  return Boolean(channel);
}

export async function fetchGuildRole(
  guild: Guild,
  roleId: string,
): Promise<Role | null> {
  return guild.roles.fetch(roleId).catch(() => null);
}

export async function fetchGuildChannel(
  guild: Guild,
  channelId: string,
): Promise<GuildBasedChannel | null> {
  return guild.channels.fetch(channelId).catch(() => null);
}

export function isSendableTextChannel(
  channel: GuildBasedChannel | null,
): channel is GuildBasedChannel & { send: (content: string) => Promise<unknown> } {
  return Boolean(channel && channel.isTextBased() && "send" in channel);
}

export interface ModerationHierarchyCheckResult {
  ok: boolean;
  errorMessage?: string;
}

function canOwnerBypassActorHierarchy(guild: Guild, actor: GuildMember): boolean {
  return isGuildOwner(guild, actor.id);
}

export function checkActorVsTargetHierarchy(params: {
  guild: Guild;
  actor: GuildMember;
  target: GuildMember | null;
  actionName: string;
  targetResolvableByIdOnly?: boolean;
}): ModerationHierarchyCheckResult {
  const { guild, actor, target, actionName, targetResolvableByIdOnly } = params;

  if (!target) {
    if (targetResolvableByIdOnly) {
      return { ok: true };
    }

    return {
      ok: false,
      errorMessage: "Could not resolve the target member in this server.",
    };
  }

  if (canOwnerBypassActorHierarchy(guild, actor)) {
    return { ok: true };
  }

  if (actor.id === target.id) {
    return {
      ok: false,
      errorMessage: `You cannot ${actionName} yourself.`,
    };
  }

  if (target.id === guild.ownerId) {
    return {
      ok: false,
      errorMessage: `You cannot ${actionName} the server owner.`,
    };
  }

  const actorHighest = actor.roles.highest;
  const targetHighest = target.roles.highest;

  if (targetHighest.comparePositionTo(actorHighest) >= 0) {
    return {
      ok: false,
      errorMessage: `You cannot ${actionName} a member with an equal or higher role.`,
    };
  }

  return { ok: true };
}

export function checkBotVsTargetHierarchy(params: {
  guild: Guild;
  botMember: GuildMember;
  target: GuildMember | null;
  actionName: string;
  targetResolvableByIdOnly?: boolean;
}): ModerationHierarchyCheckResult {
  const { guild, botMember, target, actionName, targetResolvableByIdOnly } = params;

  if (!target) {
    if (targetResolvableByIdOnly) {
      return { ok: true };
    }

    return {
      ok: false,
      errorMessage: "Could not resolve the target member in this server.",
    };
  }

  if (target.id === guild.ownerId) {
    return {
      ok: false,
      errorMessage: `I cannot ${actionName} the server owner.`,
    };
  }

  const botHighest = botMember.roles.highest;
  const targetHighest = target.roles.highest;

  if (targetHighest.comparePositionTo(botHighest) >= 0) {
    return {
      ok: false,
      errorMessage: `I cannot ${actionName} that member due to role hierarchy.`,
    };
  }

  return { ok: true };
}
