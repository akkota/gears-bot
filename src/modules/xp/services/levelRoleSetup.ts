import { PermissionFlagsBits, type Guild, type Role } from "discord.js";

export class LevelRoleSetupError extends Error {}

/** Just above @everyone — rank roles stay below staff/mod roles. */
export const LOWEST_ROLE_POSITION = 1;

export async function ensureRankDiscordRole(
  guild: Guild,
  name: string,
): Promise<{ role: Role; created: boolean }> {
  const fetched = await guild.roles.fetch();
  const existing = fetched.find((role) => role.name === name);
  if (existing) {
    return { role: existing, created: false };
  }

  return { role: await createRankDiscordRole(guild, name), created: true };
}

export async function createRankDiscordRole(guild: Guild, name: string): Promise<Role> {
  const botMember = guild.members.me;
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new LevelRoleSetupError(
      "I need the Manage Roles permission to create rank roles.",
    );
  }

  const created = await guild.roles.create({
    name,
    permissions: [],
    position: LOWEST_ROLE_POSITION,
    reason: `Create level rank ${name}`,
  });

  if (created.position !== LOWEST_ROLE_POSITION) {
    await created
      .setPosition(LOWEST_ROLE_POSITION, { reason: "Keep rank roles at the bottom" })
      .catch(() => undefined);
  }

  return created;
}
