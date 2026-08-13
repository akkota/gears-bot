import type { Guild } from "discord.js";
import {
  createAutoresponse,
  deleteAutoresponse,
  listAutoresponses,
  type AutoresponseRecord,
} from "../../../db/autoresponsesRepo.js";

export class AutorespondServiceError extends Error {}

export const MIN_TRIGGER_LENGTH = 2;
export const AUTORESPOND_COOLDOWN_MS = 8_000;

function guildMeta(guild: Guild) {
  return {
    guildId: guild.id,
    guildName: guild.name,
    guildIconUrl: guild.iconURL(),
    guildOwnerId: guild.ownerId ?? null,
  };
}

export function findMatchingAutoresponse(
  content: string,
  rules: AutoresponseRecord[],
): AutoresponseRecord | null {
  const haystack = content.toLowerCase();
  const matches = rules.filter((rule) => {
    const trigger = rule.trigger.trim().toLowerCase();
    return trigger.length >= MIN_TRIGGER_LENGTH && haystack.includes(trigger);
  });

  if (matches.length === 0) {
    return null;
  }

  return [...matches].sort((left, right) => right.trigger.length - left.trigger.length)[0] ?? null;
}

const lastFiredAt = new Map<string, number>();

export function isAutorespondOnCooldown(
  guildId: string,
  ruleId: string,
  now = Date.now(),
): boolean {
  const last = lastFiredAt.get(`${guildId}:${ruleId}`);
  if (last === undefined) {
    return false;
  }
  return now - last < AUTORESPOND_COOLDOWN_MS;
}

export function markAutorespondFired(guildId: string, ruleId: string, now = Date.now()): void {
  lastFiredAt.set(`${guildId}:${ruleId}`, now);
}

export async function addAutoresponse(params: {
  guild: Guild;
  trigger: string;
  reply: string;
  createdBy: string;
}): Promise<AutoresponseRecord> {
  const trigger = params.trigger.trim();
  const reply = params.reply.trim();
  if (trigger.length < MIN_TRIGGER_LENGTH) {
    throw new AutorespondServiceError("Trigger must be at least 2 characters.");
  }
  if (!reply) {
    throw new AutorespondServiceError("Reply cannot be empty.");
  }

  try {
    return await createAutoresponse({
      ...guildMeta(params.guild),
      trigger,
      reply,
      createdBy: params.createdBy,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("idx_autoresponses_guild_trigger") || message.includes("duplicate")) {
      throw new AutorespondServiceError("That trigger already exists in this server.");
    }
    throw error;
  }
}

export async function listGuildAutoresponses(guildId: string): Promise<AutoresponseRecord[]> {
  return listAutoresponses(guildId);
}

export async function removeAutoresponse(params: {
  guildId: string;
  id?: string;
  trigger?: string;
}): Promise<boolean> {
  const id = params.id?.trim();
  const trigger = params.trigger?.trim();
  if (!id && !trigger) {
    throw new AutorespondServiceError("Provide an id or trigger to remove.");
  }
  return deleteAutoresponse({
    guildId: params.guildId,
    id,
    trigger,
  });
}
