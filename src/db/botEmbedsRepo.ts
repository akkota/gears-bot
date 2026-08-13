import { supabase } from "./supabase.js";

export interface BotEmbedRecord {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  title: string | null;
  description: string | null;
  color: number | null;
  imageUrl: string | null;
  createdBy: string;
}

interface BotEmbedRow {
  id: string;
  guild_id: string;
  channel_id: string;
  message_id: string;
  title: string | null;
  description: string | null;
  color: number | null;
  image_url: string | null;
  created_by: string;
}

function mapRow(row: BotEmbedRow): BotEmbedRecord {
  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    messageId: row.message_id,
    title: row.title,
    description: row.description,
    color: row.color,
    imageUrl: row.image_url,
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
    throw new Error(`Failed to upsert guild for bot embeds: ${error.message}`);
  }
}

export async function createBotEmbed(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  channelId: string;
  messageId: string;
  title: string | null;
  description: string | null;
  color: number | null;
  imageUrl: string | null;
  createdBy: string;
}): Promise<BotEmbedRecord> {
  await ensureGuildExists(input);

  const { data, error } = await supabase
    .from("bot_embeds")
    .insert({
      guild_id: input.guildId,
      channel_id: input.channelId,
      message_id: input.messageId,
      title: input.title,
      description: input.description,
      color: input.color,
      image_url: input.imageUrl,
      created_by: input.createdBy,
    })
    .select("id,guild_id,channel_id,message_id,title,description,color,image_url,created_by")
    .single<BotEmbedRow>();

  if (error || !data) {
    throw new Error(`Failed to store bot embed: ${error?.message ?? "unknown error"}`);
  }

  return mapRow(data);
}

export async function getBotEmbed(
  guildId: string,
  messageId: string,
): Promise<BotEmbedRecord | null> {
  const { data, error } = await supabase
    .from("bot_embeds")
    .select("id,guild_id,channel_id,message_id,title,description,color,image_url,created_by")
    .eq("guild_id", guildId)
    .eq("message_id", messageId)
    .maybeSingle<BotEmbedRow>();

  if (error) {
    throw new Error(`Failed to fetch bot embed: ${error.message}`);
  }

  return data ? mapRow(data) : null;
}

export async function updateBotEmbed(
  guildId: string,
  messageId: string,
  patch: {
    title?: string | null;
    description?: string | null;
    color?: number | null;
    imageUrl?: string | null;
  },
): Promise<BotEmbedRecord | null> {
  const payload: Record<string, string | number | null> = {
    updated_at: new Date().toISOString(),
  };
  if (Object.hasOwn(patch, "title")) {
    payload.title = patch.title ?? null;
  }
  if (Object.hasOwn(patch, "description")) {
    payload.description = patch.description ?? null;
  }
  if (Object.hasOwn(patch, "color")) {
    payload.color = patch.color ?? null;
  }
  if (Object.hasOwn(patch, "imageUrl")) {
    payload.image_url = patch.imageUrl ?? null;
  }

  const { data, error } = await supabase
    .from("bot_embeds")
    .update(payload)
    .eq("guild_id", guildId)
    .eq("message_id", messageId)
    .select("id,guild_id,channel_id,message_id,title,description,color,image_url,created_by")
    .maybeSingle<BotEmbedRow>();

  if (error) {
    throw new Error(`Failed to update bot embed: ${error.message}`);
  }

  return data ? mapRow(data) : null;
}
