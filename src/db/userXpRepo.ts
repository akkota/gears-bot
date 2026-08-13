import { supabase } from "./supabase.js";

export interface UserXpRecord {
  guildId: string;
  userId: string;
  xp: number;
  lastMessageXpAt: string | null;
}

interface UserXpRow {
  guild_id: string;
  user_id: string;
  xp: number;
  last_message_xp_at: string | null;
}

function mapRow(row: UserXpRow): UserXpRecord {
  return {
    guildId: row.guild_id,
    userId: row.user_id,
    xp: row.xp,
    lastMessageXpAt: row.last_message_xp_at,
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
    throw new Error(`Failed to upsert guild for XP: ${error.message}`);
  }
}

export async function getUserXp(
  guildId: string,
  userId: string,
): Promise<UserXpRecord | null> {
  const { data, error } = await supabase
    .from("user_xp")
    .select("guild_id,user_id,xp,last_message_xp_at")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .maybeSingle<UserXpRow>();

  if (error) {
    throw new Error(`Failed to fetch user XP: ${error.message}`);
  }

  return data ? mapRow(data) : null;
}

export async function upsertUserXp(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  userId: string;
  xp: number;
  lastMessageXpAt?: string | null;
}): Promise<UserXpRecord> {
  await ensureGuildExists(input);
  const now = new Date().toISOString();

  const payload: Record<string, string | number | null> = {
    guild_id: input.guildId,
    user_id: input.userId,
    xp: input.xp,
    updated_at: now,
  };

  if (Object.hasOwn(input, "lastMessageXpAt")) {
    payload.last_message_xp_at = input.lastMessageXpAt ?? null;
  }

  const { data, error } = await supabase
    .from("user_xp")
    .upsert(payload, { onConflict: "guild_id,user_id" })
    .select("guild_id,user_id,xp,last_message_xp_at")
    .single<UserXpRow>();

  if (error || !data) {
    throw new Error(`Failed to upsert user XP: ${error?.message ?? "unknown error"}`);
  }

  return mapRow(data);
}
