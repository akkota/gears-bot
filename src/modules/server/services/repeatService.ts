import type { Guild } from "discord.js";
import {
  createRepeatMessage,
  deleteRepeatMessage,
  listRepeatMessages,
  type RepeatMessageRecord,
} from "../../../db/repeatMessagesRepo.js";
import { parseDuration } from "../../../shared/time.js";

export class RepeatServiceError extends Error {}

export const MIN_REPEAT_INTERVAL_MS = 60_000;
export const MAX_REPEAT_INTERVAL_MS = 30 * 86_400_000;

function guildMeta(guild: Guild) {
  return {
    guildId: guild.id,
    guildName: guild.name,
    guildIconUrl: guild.iconURL(),
    guildOwnerId: guild.ownerId ?? null,
  };
}

export function parseRepeatInterval(input: string): { intervalMs: number; normalized: string } {
  const parsed = parseDuration(input);
  if (!parsed) {
    throw new RepeatServiceError("Use a relative interval like 10m, 1h, or 1d.");
  }
  if (parsed.durationMs < MIN_REPEAT_INTERVAL_MS) {
    throw new RepeatServiceError("The shortest repeat interval is 1 minute.");
  }
  if (parsed.durationMs > MAX_REPEAT_INTERVAL_MS) {
    throw new RepeatServiceError("The longest repeat interval is 30 days.");
  }
  return { intervalMs: parsed.durationMs, normalized: parsed.normalized };
}

export async function addRepeatMessage(params: {
  guild: Guild;
  channelId: string;
  content: string;
  intervalInput: string;
  createdBy: string;
}): Promise<RepeatMessageRecord> {
  const content = params.content.trim();
  if (!content) {
    throw new RepeatServiceError("Repeat message cannot be empty.");
  }

  const interval = parseRepeatInterval(params.intervalInput);
  const nextRunAt = new Date(Date.now() + interval.intervalMs).toISOString();

  return createRepeatMessage({
    ...guildMeta(params.guild),
    channelId: params.channelId,
    content,
    intervalMs: interval.intervalMs,
    nextRunAt,
    createdBy: params.createdBy,
  });
}

export async function listGuildRepeatMessages(guildId: string): Promise<RepeatMessageRecord[]> {
  return listRepeatMessages(guildId);
}

export async function removeRepeatMessage(guildId: string, id: string): Promise<boolean> {
  return deleteRepeatMessage(guildId, id.trim());
}

export function formatInterval(intervalMs: number): string {
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (intervalMs % day === 0) {
    return `${intervalMs / day}d`;
  }
  if (intervalMs % hour === 0) {
    return `${intervalMs / hour}h`;
  }
  if (intervalMs % minute === 0) {
    return `${intervalMs / minute}m`;
  }
  return `${Math.round(intervalMs / 1000)}s`;
}
