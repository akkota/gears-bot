import { supabase } from "./supabase.js";

export interface RepeatMessageRecord {
  id: string;
  guildId: string;
  channelId: string;
  content: string;
  intervalMs: number;
  nextRunAt: string;
  createdBy: string;
}

interface RepeatMessageRow {
  id: string;
  guild_id: string;
  channel_id: string;
  content: string;
  interval_ms: number;
  next_run_at: string;
  created_by: string;
}

function mapRow(row: RepeatMessageRow): RepeatMessageRecord {
  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    content: row.content,
    intervalMs: row.interval_ms,
    nextRunAt: row.next_run_at,
    createdBy: row.created_by,
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
    throw new Error(`Failed to upsert guild for repeat messages: ${error.message}`);
  }
}

export async function createRepeatMessage(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  channelId: string;
  content: string;
  intervalMs: number;
  nextRunAt: string;
  createdBy: string;
}): Promise<RepeatMessageRecord> {
  await ensureGuildExists(input);

  const { data, error } = await supabase
    .from("repeat_messages")
    .insert({
      guild_id: input.guildId,
      channel_id: input.channelId,
      content: input.content,
      interval_ms: input.intervalMs,
      next_run_at: input.nextRunAt,
      created_by: input.createdBy,
    })
    .select("id,guild_id,channel_id,content,interval_ms,next_run_at,created_by")
    .single<RepeatMessageRow>();

  if (error || !data) {
    throw new Error(`Failed to create repeat message: ${error?.message ?? "unknown error"}`);
  }

  return mapRow(data);
}

export async function listRepeatMessages(guildId: string): Promise<RepeatMessageRecord[]> {
  const { data, error } = await supabase
    .from("repeat_messages")
    .select("id,guild_id,channel_id,content,interval_ms,next_run_at,created_by")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: true })
    .returns<RepeatMessageRow[]>();

  if (error) {
    throw new Error(`Failed to list repeat messages: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

export async function deleteRepeatMessage(guildId: string, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("repeat_messages")
    .delete()
    .eq("guild_id", guildId)
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  if (error) {
    throw new Error(`Failed to delete repeat message: ${error.message}`);
  }

  return (data ?? []).length > 0;
}

export async function getDueRepeatMessages(limit = 25): Promise<RepeatMessageRecord[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("repeat_messages")
    .select("id,guild_id,channel_id,content,interval_ms,next_run_at,created_by")
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(limit)
    .returns<RepeatMessageRow[]>();

  if (error) {
    throw new Error(`Failed to fetch due repeat messages: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

export async function bumpRepeatMessage(id: string, nextRunAt: string): Promise<void> {
  const { error } = await supabase
    .from("repeat_messages")
    .update({
      next_run_at: nextRunAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to bump repeat message: ${error.message}`);
  }
}
