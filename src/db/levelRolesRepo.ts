import { supabase } from "./supabase.js";

export interface LevelRoleRecord {
  id: string;
  guildId: string;
  name: string;
  requiredLevel: number;
  discordRoleId: string;
}

interface LevelRoleRow {
  id: string;
  guild_id: string;
  name: string;
  required_level: number;
  discord_role_id: string;
}

function mapRow(row: LevelRoleRow): LevelRoleRecord {
  return {
    id: row.id,
    guildId: row.guild_id,
    name: row.name,
    requiredLevel: row.required_level,
    discordRoleId: row.discord_role_id,
  };
}

async function ensureGuildExists(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("guilds").upsert(
    {
      guild_id: input.guildId,
      name: input.guildName,
      icon_url: input.guildIconUrl,
      owner_id: input.guildOwnerId,
      updated_at: now,
    },
    { onConflict: "guild_id", ignoreDuplicates: false },
  );

  if (error) {
    throw new Error(`Failed to upsert guild for level roles: ${error.message}`);
  }
}

export async function listLevelRoles(guildId: string): Promise<LevelRoleRecord[]> {
  const { data, error } = await supabase
    .from("level_roles")
    .select("id,guild_id,name,required_level,discord_role_id")
    .eq("guild_id", guildId)
    .order("required_level", { ascending: true })
    .returns<LevelRoleRow[]>();

  if (error) {
    throw new Error(`Failed to list level roles: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

export async function createLevelRole(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  name: string;
  requiredLevel: number;
  discordRoleId: string;
}): Promise<LevelRoleRecord> {
  await ensureGuildExists(input);

  const { data, error } = await supabase
    .from("level_roles")
    .insert({
      guild_id: input.guildId,
      name: input.name,
      required_level: input.requiredLevel,
      discord_role_id: input.discordRoleId,
    })
    .select("id,guild_id,name,required_level,discord_role_id")
    .single<LevelRoleRow>();

  if (error || !data) {
    throw new Error(`Failed to create level role: ${error?.message ?? "unknown error"}`);
  }

  return mapRow(data);
}

export async function deleteLevelRole(input: {
  guildId: string;
  name?: string;
  requiredLevel?: number;
}): Promise<boolean> {
  let query = supabase.from("level_roles").delete().eq("guild_id", input.guildId);

  if (input.name) {
    query = query.ilike("name", input.name);
  }

  if (typeof input.requiredLevel === "number") {
    query = query.eq("required_level", input.requiredLevel);
  }

  const { data, error } = await query
    .select("id")
    .returns<{ id: string }[]>();

  if (error) {
    throw new Error(`Failed to delete level role: ${error.message}`);
  }

  return (data ?? []).length > 0;
}
