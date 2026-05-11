import { supabase } from "./supabase.js";

export interface UserTimezoneRecord {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  userId: string;
  timezone: string;
}

interface UserTimezoneRow {
  guild_id: string;
  user_id: string;
  timezone: string;
}

function mapRow(row: UserTimezoneRow): UserTimezoneRecord {
  return {
    guildId: row.guild_id,
    guildName: null,
    guildIconUrl: null,
    guildOwnerId: null,
    userId: row.user_id,
    timezone: row.timezone,
  };
}

async function ensureGuildExists(input: UserTimezoneRecord): Promise<void> {
  const { error } = await supabase.from("guilds").upsert(
    {
      guild_id: input.guildId,
      name: input.guildName,
      icon_url: input.guildIconUrl,
      owner_id: input.guildOwnerId,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "guild_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    throw new Error(`Failed to ensure guild for user timezone: ${error.message}`);
  }
}

export async function upsertUserTimezone(input: UserTimezoneRecord): Promise<UserTimezoneRecord> {
  await ensureGuildExists(input);

  const { data, error } = await supabase
    .from("user_timezones")
    .upsert(
      {
        guild_id: input.guildId,
        user_id: input.userId,
        timezone: input.timezone,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "guild_id,user_id",
        ignoreDuplicates: false,
      },
    )
    .select("guild_id,user_id,timezone")
    .single<UserTimezoneRow>();

  if (error || !data) {
    throw new Error(`Failed to upsert user timezone: ${error?.message ?? "unknown error"}`);
  }

  return mapRow(data);
}

export async function getUserTimezone(
  guildId: string,
  userId: string,
): Promise<UserTimezoneRecord | null> {
  const { data, error } = await supabase
    .from("user_timezones")
    .select("guild_id,user_id,timezone")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .maybeSingle<UserTimezoneRow>();

  if (error) {
    throw new Error(`Failed to fetch user timezone: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapRow(data);
}
