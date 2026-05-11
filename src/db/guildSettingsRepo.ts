import { supabase } from "./supabase.js";

export interface GuildRecordInput {
  guildId: string;
  name: string | null;
  iconUrl: string | null;
  ownerId: string | null;
}

export interface GuildSettings {
  guildId: string;
  adminRoleId: string | null;
  srmodRoleId: string | null;
  modRoleId: string | null;
  logChannelId: string | null;
}

export interface GuildSettingsUpdate {
  adminRoleId?: string | null;
  srmodRoleId?: string | null;
  modRoleId?: string | null;
  logChannelId?: string | null;
}

interface GuildSettingsRow {
  guild_id: string;
  admin_role_id: string | null;
  srmod_role_id: string | null;
  mod_role_id: string | null;
  log_channel_id: string | null;
}

const SELECT_COLUMNS =
  "guild_id,admin_role_id,srmod_role_id,mod_role_id,log_channel_id";

function mapGuildSettingsRow(row: GuildSettingsRow): GuildSettings {
  return {
    guildId: row.guild_id,
    adminRoleId: row.admin_role_id,
    srmodRoleId: row.srmod_role_id,
    modRoleId: row.mod_role_id,
    logChannelId: row.log_channel_id,
  };
}

async function ensureGuildExists(guild: GuildRecordInput): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("guilds").upsert(
    {
      guild_id: guild.guildId,
      name: guild.name,
      icon_url: guild.iconUrl,
      owner_id: guild.ownerId,
      updated_at: now,
    },
    {
      onConflict: "guild_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    throw new Error(`Failed to upsert guild record: ${error.message}`);
  }
}

async function ensureGuildSettingsRow(guildId: string): Promise<void> {
  const { error } = await supabase.from("guild_settings").upsert(
    {
      guild_id: guildId,
    },
    {
      onConflict: "guild_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    throw new Error(`Failed to ensure guild_settings row: ${error.message}`);
  }
}

export async function getGuildSettings(
  guildId: string,
): Promise<GuildSettings | null> {
  const { data, error } = await supabase
    .from("guild_settings")
    .select(SELECT_COLUMNS)
    .eq("guild_id", guildId)
    .maybeSingle<GuildSettingsRow>();

  if (error) {
    throw new Error(`Failed to fetch guild settings: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapGuildSettingsRow(data);
}

function toDbUpdatePayload(update: GuildSettingsUpdate): Record<string, string | null> {
  const payload: Record<string, string | null> = {};

  if (Object.hasOwn(update, "adminRoleId")) {
    payload.admin_role_id = update.adminRoleId ?? null;
  }

  if (Object.hasOwn(update, "srmodRoleId")) {
    payload.srmod_role_id = update.srmodRoleId ?? null;
  }

  if (Object.hasOwn(update, "modRoleId")) {
    payload.mod_role_id = update.modRoleId ?? null;
  }

  if (Object.hasOwn(update, "logChannelId")) {
    payload.log_channel_id = update.logChannelId ?? null;
  }

  return payload;
}

export async function upsertGuildSettings(
  guild: GuildRecordInput,
  update: GuildSettingsUpdate,
): Promise<GuildSettings> {
  await ensureGuildExists(guild);
  await ensureGuildSettingsRow(guild.guildId);

  const updatePayload = toDbUpdatePayload(update);

  const { error: updateError } = await supabase
    .from("guild_settings")
    .update({
      ...updatePayload,
      updated_at: new Date().toISOString(),
    })
    .eq("guild_id", guild.guildId);

  if (updateError) {
    throw new Error(`Failed to update guild settings: ${updateError.message}`);
  }

  const updatedSettings = await getGuildSettings(guild.guildId);

  if (!updatedSettings) {
    throw new Error("Guild settings row missing after update.");
  }

  return updatedSettings;
}
