import { supabase } from "./supabase.js";

export type ModerationAction = "purge" | "mute" | "kick";

export interface CreateModerationCaseInput {
  guildId: string;
  action: ModerationAction;
  targetUserId: string | null;
  moderatorUserId: string;
  reason: string | null;
  channelId: string | null;
  metadata?: Record<string, unknown>;
}

export interface ModerationCaseRecord {
  id: string;
}

export interface CreatePurgeLogInput {
  guildId: string;
  channelId: string;
  moderatorUserId: string;
  amountRequested: number;
  amountDeleted: number;
  filterUserId: string | null;
  reason: string | null;
  caseId: string | null;
}

export interface UpsertActiveMuteInput {
  guildId: string;
  userId: string;
  caseId: string | null;
  mutedByUserId: string;
  reason: string | null;
  expiresAt: string | null;
}

export async function createModerationCase(
  input: CreateModerationCaseInput,
): Promise<ModerationCaseRecord> {
  const { data, error } = await supabase
    .from("moderation_cases")
    .insert({
      guild_id: input.guildId,
      action: input.action,
      target_user_id: input.targetUserId,
      moderator_user_id: input.moderatorUserId,
      reason: input.reason,
      channel_id: input.channelId,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(
      `Failed to create moderation case: ${error?.message ?? "unknown error"}`,
    );
  }

  return data;
}

export async function createPurgeLog(input: CreatePurgeLogInput): Promise<void> {
  const { error } = await supabase.from("purge_logs").insert({
    guild_id: input.guildId,
    channel_id: input.channelId,
    moderator_user_id: input.moderatorUserId,
    amount_requested: input.amountRequested,
    amount_deleted: input.amountDeleted,
    filter_user_id: input.filterUserId,
    reason: input.reason,
    case_id: input.caseId,
  });

  if (error) {
    throw new Error(`Failed to create purge log: ${error.message}`);
  }
}

export async function upsertActiveMute(
  input: UpsertActiveMuteInput,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("active_mutes").upsert(
    {
      guild_id: input.guildId,
      user_id: input.userId,
      case_id: input.caseId,
      muted_by_user_id: input.mutedByUserId,
      reason: input.reason,
      expires_at: input.expiresAt,
      active: true,
      updated_at: now,
    },
    {
      onConflict: "guild_id,user_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    throw new Error(`Failed to upsert active mute: ${error.message}`);
  }
}
