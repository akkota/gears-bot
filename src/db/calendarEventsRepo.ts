import { supabase } from "./supabase.js";

export interface CalendarSyncRecord {
  guildId: string;
  googleEventId: string;
  discordEventId: string | null;
  etag: string | null;
  status: string;
}

interface CalendarSyncRow {
  guild_id: string;
  google_event_id: string;
  discord_event_id: string | null;
  etag: string | null;
  status: string;
}

function mapRow(row: CalendarSyncRow): CalendarSyncRecord {
  return {
    guildId: row.guild_id,
    googleEventId: row.google_event_id,
    discordEventId: row.discord_event_id,
    etag: row.etag,
    status: row.status,
  };
}

export async function getCalendarSync(
  guildId: string,
  googleEventId: string,
): Promise<CalendarSyncRecord | null> {
  const { data, error } = await supabase
    .from("calendar_event_sync")
    .select("guild_id,google_event_id,discord_event_id,etag,status")
    .eq("guild_id", guildId)
    .eq("google_event_id", googleEventId)
    .maybeSingle<CalendarSyncRow>();

  if (error) {
    throw new Error(`Failed to fetch calendar sync row: ${error.message}`);
  }

  return data ? mapRow(data) : null;
}

export async function upsertCalendarSync(input: CalendarSyncRecord): Promise<void> {
  const { error } = await supabase.from("calendar_event_sync").upsert(
    {
      guild_id: input.guildId,
      google_event_id: input.googleEventId,
      discord_event_id: input.discordEventId,
      etag: input.etag,
      status: input.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "guild_id,google_event_id" },
  );

  if (error) {
    throw new Error(`Failed to upsert calendar sync row: ${error.message}`);
  }
}

export async function listCalendarSyncForGuild(
  guildId: string,
): Promise<CalendarSyncRecord[]> {
  const { data, error } = await supabase
    .from("calendar_event_sync")
    .select("guild_id,google_event_id,discord_event_id,etag,status")
    .eq("guild_id", guildId)
    .returns<CalendarSyncRow[]>();

  if (error) {
    throw new Error(`Failed to list calendar sync rows: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}
