import {
  PermissionsBitField,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type PermissionResolvable,
  type Role,
  type User,
} from "discord.js";
import {
  getGuildSettings,
  type GuildSettings,
  type GuildSettingsUpdate,
  upsertGuildSettings,
} from "../../../db/guildSettingsRepo.js";
import { isSendableTextChannel } from "../../../shared/discordChecks.js";

export type StaffRoleKind = "admin" | "srmod" | "mod";

type StaffRoleSource = "selected" | "configured" | "named-default" | "created";

const STAFF_ROLE_NAMES: Record<StaffRoleKind, string> = {
  admin: "Admin",
  srmod: "SrMod",
  mod: "Mod",
};

const CREATED_ROLE_PERMISSIONS: Record<StaffRoleKind, PermissionResolvable[]> = {
  admin: [PermissionFlagsBits.Administrator],
  srmod: [
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
  ],
  mod: [
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageMessages,
  ],
};

export class StaffRoleSetupError extends Error {}

export interface ResolveStaffRoleStrategyInput {
  selectedRoleId?: string | null;
  customNameRoleId?: string | null;
  configuredRoleId?: string | null;
  fallbackNamedRoleId?: string | null;
}

export interface ResolveStaffRoleStrategyResult {
  action:
    | "use-selected"
    | "use-custom-name"
    | "use-configured"
    | "use-fallback-name"
    | "create-with-name";
  roleId: string | null;
}

export function resolveStaffRoleStrategy(
  input: ResolveStaffRoleStrategyInput,
): ResolveStaffRoleStrategyResult {
  if (input.selectedRoleId) {
    return { action: "use-selected", roleId: input.selectedRoleId };
  }

  if (input.customNameRoleId) {
    return { action: "use-custom-name", roleId: input.customNameRoleId };
  }

  if (input.configuredRoleId) {
    return { action: "use-configured", roleId: input.configuredRoleId };
  }

  if (input.fallbackNamedRoleId) {
    return { action: "use-fallback-name", roleId: input.fallbackNamedRoleId };
  }

  return { action: "create-with-name", roleId: null };
}

function buildGuildRecord(guild: Guild) {
  return {
    guildId: guild.id,
    name: guild.name,
    iconUrl: guild.iconURL(),
    ownerId: guild.ownerId ?? null,
  };
}

function getSettingKey(roleKind: StaffRoleKind): keyof GuildSettingsUpdate {
  if (roleKind === "admin") {
    return "adminRoleId";
  }

  if (roleKind === "srmod") {
    return "srmodRoleId";
  }

  return "modRoleId";
}

export function getUnsetGuildSettingsUpdate(
  roleKind: StaffRoleKind,
): GuildSettingsUpdate {
  const key = getSettingKey(roleKind);
  return { [key]: null } as GuildSettingsUpdate;
}

export interface SetRoleInputValidationResult {
  ok: boolean;
  normalizedName: string | null;
  errorMessage?: string;
}

export function canPersistRoleConfigurationAfterSync(
  syncSucceeded: boolean,
): boolean {
  return syncSucceeded;
}

export function validateSetRoleInputs(input: {
  selectedRoleId?: string | null;
  customName?: string | null;
}): SetRoleInputValidationResult {
  const selectedRoleId = input.selectedRoleId ?? null;
  const customNameRaw = input.customName ?? null;

  if (selectedRoleId && customNameRaw !== null) {
    return {
      ok: false,
      normalizedName: null,
      errorMessage: "Provide either role or name, not both.",
    };
  }

  if (customNameRaw === null) {
    return {
      ok: true,
      normalizedName: null,
    };
  }

  const normalized = customNameRaw.trim();
  if (normalized.length === 0) {
    return {
      ok: false,
      normalizedName: null,
      errorMessage: "Role name cannot be empty.",
    };
  }

  if (normalized.length > 100) {
    return {
      ok: false,
      normalizedName: null,
      errorMessage: "Role name must be 100 characters or fewer.",
    };
  }

  return {
    ok: true,
    normalizedName: normalized,
  };
}

function getConfiguredRoleId(
  settings: GuildSettings | null,
  roleKind: StaffRoleKind,
): string | null {
  if (!settings) {
    return null;
  }

  if (roleKind === "admin") {
    return settings.adminRoleId;
  }

  if (roleKind === "srmod") {
    return settings.srmodRoleId;
  }

  return settings.modRoleId;
}

async function getBotMember(guild: Guild): Promise<GuildMember> {
  const cachedMe = guild.members.me;
  if (cachedMe) {
    return cachedMe;
  }

  const clientUserId = guild.client.user?.id;
  if (!clientUserId) {
    throw new StaffRoleSetupError("Bot user is unavailable.");
  }

  const me = await guild.members.fetch(clientUserId).catch(() => null);
  if (!me) {
    throw new StaffRoleSetupError("Bot member could not be resolved in this server.");
  }

  return me;
}

function assertBotCanManageRoles(botMember: GuildMember): void {
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new StaffRoleSetupError(
      "Bot requires the Manage Roles permission to manage staff roles.",
    );
  }
}

function assertRoleCanBeManagedByBot(
  guild: Guild,
  role: Role,
  botMember: GuildMember,
): void {
  if (role.id === guild.id) {
    throw new StaffRoleSetupError("Cannot configure the @everyone role.");
  }

  if (role.managed) {
    throw new StaffRoleSetupError(
      "Cannot configure a managed or integration role.",
    );
  }

  assertBotCanManageRoles(botMember);

  if (role.comparePositionTo(botMember.roles.highest) >= 0) {
    throw new StaffRoleSetupError(
      "Bot cannot manage that role because it is higher than or equal to the bot's highest role.",
    );
  }
}

async function fetchRoleByNameExact(guild: Guild, roleName: string): Promise<Role | null> {
  const roles = await guild.roles.fetch();
  return roles.find((role) => role.name === roleName) ?? null;
}

async function syncRolePermissions(
  role: Role,
  roleKind: StaffRoleKind,
): Promise<void> {
  const required = new PermissionsBitField(CREATED_ROLE_PERMISSIONS[roleKind]);
  const merged = new PermissionsBitField(role.permissions.bitfield).add(required);

  if (merged.bitfield === role.permissions.bitfield) {
    return;
  }

  await role.setPermissions(
    merged.bitfield,
    `Sync required permissions for ${STAFF_ROLE_NAMES[roleKind]} role`,
  );
}

async function trySendSetupLog(
  guild: Guild,
  logChannelId: string | null,
  message: string,
): Promise<void> {
  if (!logChannelId) {
    return;
  }

  const channel = await guild.channels.fetch(logChannelId).catch(() => null);

  if (!isSendableTextChannel(channel)) {
    return;
  }

  await channel.send(message).catch(() => undefined);
}

function setupAuditMessage(
  action: string,
  value: string,
  actor: User,
): string {
  return `[Setup] ${action}: ${value} by ${actor.tag} (${actor.id})`;
}

async function configureStaffRoleInSettings(
  guild: Guild,
  roleKind: StaffRoleKind,
  roleId: string,
  actor: User,
): Promise<GuildSettings> {
  const key = getSettingKey(roleKind);
  const settings = await upsertGuildSettings(buildGuildRecord(guild), {
    [key]: roleId,
  } as GuildSettingsUpdate);

  await trySendSetupLog(
    guild,
    settings.logChannelId,
    setupAuditMessage(`${key}`, roleId, actor),
  );

  return settings;
}

async function clearStaffRoleInSettings(
  guild: Guild,
  roleKind: StaffRoleKind,
  actor: User,
): Promise<GuildSettings> {
  const key = getSettingKey(roleKind);
  const settings = await upsertGuildSettings(
    buildGuildRecord(guild),
    getUnsetGuildSettingsUpdate(roleKind),
  );

  await trySendSetupLog(
    guild,
    settings.logChannelId,
    setupAuditMessage(`${key}`, "null", actor),
  );

  return settings;
}

async function resolveRoleForStaffSetup(params: {
  guild: Guild;
  roleKind: StaffRoleKind;
  selectedRoleId?: string | null;
  customRoleName?: string | null;
}): Promise<{ role: Role; source: StaffRoleSource }> {
  const { guild, roleKind, selectedRoleId, customRoleName } = params;
  const settings = await getGuildSettings(guild.id);
  const configuredRoleId = getConfiguredRoleId(settings, roleKind);
  const botMember = await getBotMember(guild);

  const defaultName = STAFF_ROLE_NAMES[roleKind];
  const requestedRoleName = customRoleName ?? defaultName;
  const requestedNameRole = await fetchRoleByNameExact(guild, requestedRoleName);
  const fallbackNamedRole = customRoleName
    ? null
    : await fetchRoleByNameExact(guild, defaultName);

  const strategy = resolveStaffRoleStrategy({
    selectedRoleId: selectedRoleId ?? null,
    customNameRoleId: requestedNameRole?.id ?? null,
    configuredRoleId,
    fallbackNamedRoleId: fallbackNamedRole?.id ?? null,
  });

  if (strategy.action === "create-with-name") {
    assertBotCanManageRoles(botMember);

    const createdRole = await guild.roles.create({
      name: requestedRoleName,
      reason: `Create ${requestedRoleName} staff role`,
    });

    assertRoleCanBeManagedByBot(guild, createdRole, botMember);
    return { role: createdRole, source: "created" };
  }

  const role = await guild.roles.fetch(strategy.roleId as string).catch(() => null);
  if (!role) {
    if (strategy.action === "use-configured") {
      const fallbackRole = await fetchRoleByNameExact(guild, requestedRoleName);
      if (fallbackRole) {
        assertRoleCanBeManagedByBot(guild, fallbackRole, botMember);
        return {
          role: fallbackRole,
          source: customRoleName ? "selected" : "named-default",
        };
      }

      assertBotCanManageRoles(botMember);
      const createdRole = await guild.roles.create({
        name: requestedRoleName,
        reason: `Create ${requestedRoleName} staff role`,
      });

      assertRoleCanBeManagedByBot(guild, createdRole, botMember);
      return { role: createdRole, source: "created" };
    }

    throw new StaffRoleSetupError("The selected role no longer exists in this server.");
  }

  assertRoleCanBeManagedByBot(guild, role, botMember);

  const sourceMap: Record<ResolveStaffRoleStrategyResult["action"], StaffRoleSource> = {
    "use-selected": "selected",
    "use-custom-name": "selected",
    "use-configured": "configured",
    "use-fallback-name": "named-default",
    "create-with-name": "created",
  };

  return { role, source: sourceMap[strategy.action] };
}

export async function setStaffRole(params: {
  guild: Guild;
  roleKind: StaffRoleKind;
  selectedRoleId?: string | null;
  customRoleName?: string | null;
  actor: User;
}): Promise<{ settings: GuildSettings; role: Role; source: StaffRoleSource }> {
  const inputValidation = validateSetRoleInputs({
    selectedRoleId: params.selectedRoleId ?? null,
    customName: params.customRoleName ?? null,
  });

  if (!inputValidation.ok) {
    throw new StaffRoleSetupError(inputValidation.errorMessage as string);
  }

  const resolved = await resolveRoleForStaffSetup({
    guild: params.guild,
    roleKind: params.roleKind,
    selectedRoleId: params.selectedRoleId ?? null,
    customRoleName: inputValidation.normalizedName,
  });

  let syncSucceeded = false;
  try {
    await syncRolePermissions(resolved.role, params.roleKind);
    syncSucceeded = true;
  } catch {
    throw new StaffRoleSetupError(
      "Failed to sync required role permissions. Settings were not updated.",
    );
  }

  if (!canPersistRoleConfigurationAfterSync(syncSucceeded)) {
    throw new StaffRoleSetupError(
      "Failed to sync required role permissions. Settings were not updated.",
    );
  }

  const settings = await configureStaffRoleInSettings(
    params.guild,
    params.roleKind,
    resolved.role.id,
    params.actor,
  );

  if (resolved.source === "created") {
    await trySendSetupLog(
      params.guild,
      settings.logChannelId,
      setupAuditMessage(
        `${params.roleKind}_role_created`,
        `${resolved.role.name} (${resolved.role.id})`,
        params.actor,
      ),
    );
  }

  return {
    settings,
    role: resolved.role,
    source: resolved.source,
  };
}

export async function unsetStaffRole(params: {
  guild: Guild;
  roleKind: StaffRoleKind;
  deleteRole: boolean;
  actor: User;
}): Promise<{ settings: GuildSettings; deletedRoleId: string | null }> {
  const settings = await getGuildSettings(params.guild.id);
  const configuredRoleId = getConfiguredRoleId(settings, params.roleKind);

  if (!configuredRoleId) {
    throw new StaffRoleSetupError(
      `No configured ${STAFF_ROLE_NAMES[params.roleKind]} role was found.`,
    );
  }

  let deletedRoleId: string | null = null;

  if (params.deleteRole) {
    const role = await params.guild.roles.fetch(configuredRoleId).catch(() => null);
    if (!role) {
      throw new StaffRoleSetupError(
        "Configured role could not be found in the server. Unset without deletion if you only want to clear the stored setting.",
      );
    }

    const botMember = await getBotMember(params.guild);
    assertRoleCanBeManagedByBot(params.guild, role, botMember);

    await role.delete(`Deleted via /unset-${params.roleKind}-role`);
    deletedRoleId = role.id;
  }

  const updatedSettings = await clearStaffRoleInSettings(
    params.guild,
    params.roleKind,
    params.actor,
  );

  if (deletedRoleId) {
    await trySendSetupLog(
      params.guild,
      updatedSettings.logChannelId,
      setupAuditMessage(
        `${params.roleKind}_role_deleted`,
        deletedRoleId,
        params.actor,
      ),
    );
  }

  return {
    settings: updatedSettings,
    deletedRoleId,
  };
}

export async function setLogChannel(
  guild: Guild,
  channelId: string,
  actor: User,
): Promise<GuildSettings> {
  const settings = await upsertGuildSettings(buildGuildRecord(guild), {
    logChannelId: channelId,
  });

  await trySendSetupLog(
    guild,
    settings.logChannelId,
    setupAuditMessage("log_channel_id", channelId, actor),
  );

  return settings;
}
