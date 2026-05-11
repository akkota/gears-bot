import { supabase } from "./supabase.js";

export interface CreateReminderInput {
  guildId: string | null;
  guildName: string | null;
  guildIconUrl: string | null;
  guildOwnerId: string | null;
  userId: string;
  channelId: string;
  reminderText: string;
  remindAt: string;
}

export interface ReminderRecord {
  id: string;
  guildId: string | null;
  userId: string;
  channelId: string;
  reminderText: string;
  remindAt: string;
  completed: boolean;
}

interface ReminderRow {
  id: string;
  guild_id: string | null;
  user_id: string;
  channel_id: string;
  reminder_text: string;
  remind_at: string;
  completed: boolean;
}

function mapReminderRow(row: ReminderRow): ReminderRecord {
  return {
    id: row.id,
    guildId: row.guild_id,
    userId: row.user_id,
    channelId: row.channel_id,
    reminderText: row.reminder_text,
    remindAt: row.remind_at,
    completed: row.completed,
  };
}

async function ensureGuildExists(input: CreateReminderInput): Promise<void> {
  if (!input.guildId) {
    return;
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("guilds").upsert(
    {
      guild_id: input.guildId,
      name: input.guildName,
      icon_url: input.guildIconUrl,
      owner_id: input.guildOwnerId,
      updated_at: now,
    },
    {
      onConflict: "guild_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    throw new Error(`Failed to upsert guild record for reminder: ${error.message}`);
  }
}

export async function createReminder(input: CreateReminderInput): Promise<ReminderRecord> {
  await ensureGuildExists(input);

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      guild_id: input.guildId,
      user_id: input.userId,
      channel_id: input.channelId,
      reminder_text: input.reminderText,
      remind_at: input.remindAt,
    })
    .select("id,guild_id,user_id,channel_id,reminder_text,remind_at,completed")
    .single<ReminderRow>();

  if (error || !data) {
    throw new Error(`Failed to create reminder: ${error?.message ?? "unknown error"}`);
  }

  return mapReminderRow(data);
}

export async function getDueReminders(limit = 25): Promise<ReminderRecord[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("reminders")
    .select("id,guild_id,user_id,channel_id,reminder_text,remind_at,completed")
    .eq("completed", false)
    .lte("remind_at", now)
    .order("remind_at", { ascending: true })
    .limit(limit)
    .returns<ReminderRow[]>();

  if (error) {
    throw new Error(`Failed to fetch due reminders: ${error.message}`);
  }

  return (data ?? []).map(mapReminderRow);
}

export async function markReminderCompleted(reminderId: string): Promise<void> {
  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("reminders")
    .update({
      completed: true,
      completed_at: completedAt,
    })
    .eq("id", reminderId)
    .eq("completed", false);

  if (error) {
    throw new Error(`Failed to mark reminder completed: ${error.message}`);
  }
}
