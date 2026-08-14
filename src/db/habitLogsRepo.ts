import { supabase } from "./supabase.js";

export interface PendingHabitLog {
  id: string;
  userId: string;
  note: string | null;
  imagePath: string;
  actionName: string;
  displayName: string | null;
  discordUserId: string | null;
}

interface PendingHabitRow {
  id: string;
  user_id: string;
  note: string | null;
  image_path: string;
  habit_actions: { name: string } | { name: string }[] | null;
  profiles: {
    display_name: string | null;
    discord_user_id: string | null;
  } | {
    display_name: string | null;
    discord_user_id: string | null;
  }[] | null;
}

function firstRel<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listPendingHabitLogsWithoutDiscord(limit = 20): Promise<PendingHabitLog[]> {
  const { data, error } = await supabase
    .from("habit_logs")
    .select(
      "id,user_id,note,image_path,habit_actions(name),profiles(display_name,discord_user_id)",
    )
    .eq("status", "pending")
    .is("discord_message_id", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list pending habit logs: ${error.message}`);
  }

  return ((data ?? []) as PendingHabitRow[]).map((row) => {
    const action = firstRel(row.habit_actions);
    const profile = firstRel(row.profiles);
    return {
      id: row.id,
      userId: row.user_id,
      note: row.note,
      imagePath: row.image_path,
      actionName: action?.name ?? "Habit",
      displayName: profile?.display_name ?? null,
      discordUserId: profile?.discord_user_id ?? null,
    };
  });
}

export async function attachHabitDiscordMessage(input: {
  id: string;
  channelId: string;
  messageId: string;
}): Promise<void> {
  const { error } = await supabase
    .from("habit_logs")
    .update({
      discord_channel_id: input.channelId,
      discord_message_id: input.messageId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Failed to attach Discord message to habit log: ${error.message}`);
  }
}

export async function resolveHabitLogFromDiscord(input: {
  id: string;
  status: "verified" | "rejected";
}): Promise<boolean> {
  const { data, error } = await supabase
    .from("habit_logs")
    .update({
      status: input.status,
      verified_by: "discord",
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve habit log: ${error.message}`);
  }

  return Boolean(data);
}

export async function getHabitProofSignedUrl(imagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("habit-proofs")
    .createSignedUrl(imagePath, 60 * 60);

  if (error) {
    console.error("Failed to sign habit proof URL:", error.message);
    return null;
  }

  return data.signedUrl;
}
