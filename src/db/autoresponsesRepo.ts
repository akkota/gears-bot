import { supabase } from "./supabase.js";

export interface AutoresponseRecord {
  id: string;
  guildId: string;
  trigger: string;
  reply: string;
  createdBy: string;
}

interface AutoresponseRow {
  id: string;
  guild_id: string;
  trigger: string;
  reply: string;
  created_by: string;
}

function mapRow(row: AutoresponseRow): AutoresponseRecord {
  return {
    id: row.id,
    guildId: row.guild_id,
    trigger: row.trigger,
    reply: row.reply,
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
    throw new Error(`Failed to upsert guild for autoresponses: ${error.message}`);
  }
}

export async function createAutoresponse(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  trigger: string;
  reply: string;
  createdBy: string;
}): Promise<AutoresponseRecord> {
  await ensureGuildExists(input);

  const { data, error } = await supabase
    .from("autoresponses")
    .insert({
      guild_id: input.guildId,
      trigger: input.trigger,
      reply: input.reply,
      created_by: input.createdBy,
    })
    .select("id,guild_id,trigger,reply,created_by")
    .single<AutoresponseRow>();

  if (error || !data) {
    throw new Error(`Failed to create autoresponse: ${error?.message ?? "unknown error"}`);
  }

  return mapRow(data);
}

export async function listAutoresponses(guildId: string): Promise<AutoresponseRecord[]> {
  const { data, error } = await supabase
    .from("autoresponses")
    .select("id,guild_id,trigger,reply,created_by")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: true })
    .returns<AutoresponseRow[]>();

  if (error) {
    throw new Error(`Failed to list autoresponses: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

export async function deleteAutoresponse(input: {
  guildId: string;
  id?: string;
  trigger?: string;
}): Promise<boolean> {
  let query = supabase.from("autoresponses").delete().eq("guild_id", input.guildId);

  if (input.id) {
    query = query.eq("id", input.id);
  } else if (input.trigger) {
    query = query.ilike("trigger", input.trigger);
  } else {
    return false;
  }

  const { data, error } = await query.select("id").returns<{ id: string }[]>();

  if (error) {
    throw new Error(`Failed to delete autoresponse: ${error.message}`);
  }

  return (data ?? []).length > 0;
}
