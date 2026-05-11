import { supabase } from "./supabase.js";

export interface ReactionRoleMessageRecord {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  title: string | null;
  description: string | null;
  mode: "button" | "select_menu";
  createdByUserId: string;
  active: boolean;
}

export interface ReactionRoleOptionRecord {
  id: string;
  reactionRoleMessageId: string;
  roleId: string;
  label: string;
  description: string | null;
  emoji: string | null;
  sortOrder: number;
}

interface ReactionRoleMessageRow {
  id: string;
  guild_id: string;
  channel_id: string;
  message_id: string;
  title: string | null;
  description: string | null;
  mode: "button" | "select_menu";
  created_by_user_id: string;
  active: boolean;
}

interface ReactionRoleOptionRow {
  id: string;
  reaction_role_message_id: string;
  role_id: string;
  label: string;
  description: string | null;
  emoji: string | null;
  sort_order: number;
}

function mapMessage(row: ReactionRoleMessageRow): ReactionRoleMessageRecord {
  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    messageId: row.message_id,
    title: row.title,
    description: row.description,
    mode: row.mode,
    createdByUserId: row.created_by_user_id,
    active: row.active,
  };
}

function mapOption(row: ReactionRoleOptionRow): ReactionRoleOptionRecord {
  return {
    id: row.id,
    reactionRoleMessageId: row.reaction_role_message_id,
    roleId: row.role_id,
    label: row.label,
    description: row.description,
    emoji: row.emoji,
    sortOrder: row.sort_order,
  };
}

async function ensureGuildExists(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
}): Promise<void> {
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
    throw new Error(`Failed to ensure guild for reaction role: ${error.message}`);
  }
}

export async function createReactionRoleMessage(input: {
  guildId: string;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  channelId: string;
  messageId: string;
  title: string | null;
  description: string | null;
  createdByUserId: string;
}): Promise<ReactionRoleMessageRecord> {
  await ensureGuildExists(input);

  const { data, error } = await supabase
    .from("reaction_role_messages")
    .insert({
      guild_id: input.guildId,
      channel_id: input.channelId,
      message_id: input.messageId,
      title: input.title,
      description: input.description,
      mode: "button",
      created_by_user_id: input.createdByUserId,
    })
    .select(
      "id,guild_id,channel_id,message_id,title,description,mode,created_by_user_id,active",
    )
    .single<ReactionRoleMessageRow>();

  if (error || !data) {
    throw new Error(
      `Failed to create reaction role message: ${error?.message ?? "unknown error"}`,
    );
  }

  return mapMessage(data);
}

export async function getReactionRoleMessageByGuildAndMessageId(
  guildId: string,
  messageId: string,
): Promise<ReactionRoleMessageRecord | null> {
  const { data, error } = await supabase
    .from("reaction_role_messages")
    .select(
      "id,guild_id,channel_id,message_id,title,description,mode,created_by_user_id,active",
    )
    .eq("guild_id", guildId)
    .eq("message_id", messageId)
    .maybeSingle<ReactionRoleMessageRow>();

  if (error) {
    throw new Error(`Failed to fetch reaction role panel: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapMessage(data);
}

export async function getReactionRoleMessageById(
  panelId: string,
): Promise<ReactionRoleMessageRecord | null> {
  const { data, error } = await supabase
    .from("reaction_role_messages")
    .select(
      "id,guild_id,channel_id,message_id,title,description,mode,created_by_user_id,active",
    )
    .eq("id", panelId)
    .maybeSingle<ReactionRoleMessageRow>();

  if (error) {
    throw new Error(`Failed to fetch reaction role panel by id: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapMessage(data);
}

export async function deactivateReactionRoleMessage(panelId: string): Promise<void> {
  const { error } = await supabase
    .from("reaction_role_messages")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", panelId);

  if (error) {
    throw new Error(`Failed to deactivate reaction role panel: ${error.message}`);
  }
}

export async function createReactionRoleOption(input: {
  reactionRoleMessageId: string;
  roleId: string;
  label: string;
  description: string | null;
  emoji: string | null;
  sortOrder: number;
}): Promise<ReactionRoleOptionRecord> {
  const { data, error } = await supabase
    .from("reaction_role_options")
    .insert({
      reaction_role_message_id: input.reactionRoleMessageId,
      role_id: input.roleId,
      label: input.label,
      description: input.description,
      emoji: input.emoji,
      sort_order: input.sortOrder,
    })
    .select("id,reaction_role_message_id,role_id,label,description,emoji,sort_order")
    .single<ReactionRoleOptionRow>();

  if (error || !data) {
    throw new Error(
      `Failed to create reaction role option: ${error?.message ?? "unknown error"}`,
    );
  }

  return mapOption(data);
}

export async function listReactionRoleOptions(
  reactionRoleMessageId: string,
): Promise<ReactionRoleOptionRecord[]> {
  const { data, error } = await supabase
    .from("reaction_role_options")
    .select("id,reaction_role_message_id,role_id,label,description,emoji,sort_order")
    .eq("reaction_role_message_id", reactionRoleMessageId)
    .order("sort_order", { ascending: true })
    .returns<ReactionRoleOptionRow[]>();

  if (error) {
    throw new Error(`Failed to list reaction role options: ${error.message}`);
  }

  return (data ?? []).map(mapOption);
}

export async function getReactionRoleOption(
  reactionRoleMessageId: string,
  roleId: string,
): Promise<ReactionRoleOptionRecord | null> {
  const { data, error } = await supabase
    .from("reaction_role_options")
    .select("id,reaction_role_message_id,role_id,label,description,emoji,sort_order")
    .eq("reaction_role_message_id", reactionRoleMessageId)
    .eq("role_id", roleId)
    .maybeSingle<ReactionRoleOptionRow>();

  if (error) {
    throw new Error(`Failed to fetch reaction role option: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapOption(data);
}
