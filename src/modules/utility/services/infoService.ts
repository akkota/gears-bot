import {
  EmbedBuilder,
  type Guild,
  type GuildMember,
  type Role,
  type User,
} from "discord.js";

function formatTimestamp(date: Date | null): string {
  if (!date) {
    return "Unknown";
  }

  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:F>`;
}

function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatPermissions(role: Role): string {
  const permissions = role.permissions.toArray();
  if (permissions.length === 0) {
    return "None";
  }

  const display = permissions.slice(0, 12).join(", ");
  return permissions.length > 12
    ? `${display}, +${permissions.length - 12} more`
    : display;
}

export function buildUserInfoEmbed(params: {
  user: User;
  member: GuildMember | null;
}): EmbedBuilder {
  const { user, member } = params;

  const embed = new EmbedBuilder()
    .setColor(0x2b8ae8)
    .setTitle("User Info")
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "User", value: `${user.tag} (${user.id})` },
      { name: "Bot Account", value: formatBoolean(user.bot), inline: true },
      { name: "Created", value: formatTimestamp(user.createdAt), inline: true },
    );

  if (!member) {
    embed.addFields({
      name: "Server Membership",
      value: "User is not currently in this server.",
    });
    return embed;
  }

  const nonEveryoneRoleCount = Math.max(member.roles.cache.size - 1, 0);
  embed.addFields(
    {
      name: "Display Name",
      value: member.displayName,
      inline: true,
    },
    {
      name: "Joined Server",
      value: formatTimestamp(member.joinedAt),
      inline: true,
    },
    {
      name: "Highest Role",
      value: member.roles.highest.toString(),
      inline: true,
    },
    {
      name: "Role Count",
      value: String(nonEveryoneRoleCount),
      inline: true,
    },
  );

  return embed;
}

export async function buildServerInfoEmbed(guild: Guild): Promise<EmbedBuilder> {
  const owner = await guild.fetchOwner().catch(() => null);

  return new EmbedBuilder()
    .setColor(0x00a86b)
    .setTitle("Server Info")
    .setThumbnail(guild.iconURL({ size: 256 }))
    .addFields(
      { name: "Server", value: `${guild.name} (${guild.id})` },
      {
        name: "Owner",
        value: owner ? `${owner.user.tag} (${owner.id})` : "Unknown",
      },
      { name: "Created", value: formatTimestamp(guild.createdAt) },
      { name: "Members", value: String(guild.memberCount), inline: true },
      { name: "Roles", value: String(guild.roles.cache.size), inline: true },
      { name: "Channels", value: String(guild.channels.cache.size), inline: true },
      { name: "Boost Level", value: String(guild.premiumTier), inline: true },
      { name: "Boost Count", value: String(guild.premiumSubscriptionCount ?? 0), inline: true },
    );
}

export function buildRoleInfoEmbed(role: Role): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(role.color || 0x6b7280)
    .setTitle("Role Info")
    .addFields(
      { name: "Role", value: `${role.toString()} (${role.id})` },
      { name: "Created", value: formatTimestamp(role.createdAt), inline: true },
      { name: "Position", value: String(role.position), inline: true },
      { name: "Members", value: String(role.members.size), inline: true },
      { name: "Mentionable", value: formatBoolean(role.mentionable), inline: true },
      { name: "Managed", value: formatBoolean(role.managed), inline: true },
      { name: "Hoisted", value: formatBoolean(role.hoist), inline: true },
      { name: "Color", value: role.hexColor, inline: true },
      { name: "Permissions", value: formatPermissions(role) },
    );
}
