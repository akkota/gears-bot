import { supabase } from "./supabase.js";

export interface CreateReactionRoleMessageInput {
  guildId: string;
  channelId: string;
  messageId: string;
  title: string | null;
  createdByUserId: string;
}

export interface ReactionRoleMessageRecord {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  title: string | null;
  active: boolean;
}

interface ReactionRoleMessageRow {
  id: string;
  guild_id: string;
  channel_id: string;
  message_id: string;
  title: string | null;
  active: boolean;
}

export async function createReactionRoleMessage(
  input: CreateReactionRoleMessageInput,
): Promise<ReactionRoleMessageRecord> {
  const { data, error } = await supabase
    .from("reaction_role_messages")
    .insert({
      guild_id: input.guildId,
      channel_id: input.channelId,
      message_id: input.messageId,
      title: input.title,
      created_by_user_id: input.createdByUserId,
    })
    .select("id, guild_id, channel_id, message_id, title, active")
    .single<ReactionRoleMessageRow>();

  if (error || !data) {
    throw new Error(
      `Failed to create reaction role message: ${error?.message ?? "unknown error"}`,
    );
  }

  return {
    id: data.id,
    guildId: data.guild_id,
    channelId: data.channel_id,
    messageId: data.message_id,
    title: data.title,
    active: data.active,
  };
}

export async function getReactionRoleMessage(
  guildId: string,
  messageId: string,
): Promise<ReactionRoleMessageRecord | null> {
  const { data, error } = await supabase
    .from("reaction_role_messages")
    .select("id, guild_id, channel_id, message_id, title, active")
    .eq("guild_id", guildId)
    .eq("message_id", messageId)
    .maybeSingle<ReactionRoleMessageRow>();

  if (error) {
    throw new Error(
      `Failed to fetch reaction role message: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    guildId: data.guild_id,
    channelId: data.channel_id,
    messageId: data.message_id,
    title: data.title,
    active: data.active,
  };
}
