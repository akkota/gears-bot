import type { Guild, User } from "discord.js";
import { createReminder } from "../../../db/remindersRepo.js";
import { parseDuration } from "../../../shared/time.js";

export class ReminderServiceError extends Error {}

export function parseReminderTime(input: string): { remindAt: Date; normalized: string } {
  const parsed = parseDuration(input);
  if (!parsed) {
    throw new ReminderServiceError(
      "Invalid time format. Use relative values like 10m, 2h, or 3d.",
    );
  }

  const remindAt = new Date(Date.now() + parsed.durationMs);
  return {
    remindAt,
    normalized: parsed.normalized,
  };
}

export async function createGuildReminder(input: {
  guild: Guild;
  channelId: string;
  user: User;
  reminderText: string;
  remindAt: Date;
}): Promise<{ id: string; remindAt: Date }> {
  const created = await createReminder({
    guildId: input.guild.id,
    guildName: input.guild.name,
    guildIconUrl: input.guild.iconURL(),
    guildOwnerId: input.guild.ownerId ?? null,
    userId: input.user.id,
    channelId: input.channelId,
    reminderText: input.reminderText,
    remindAt: input.remindAt.toISOString(),
  });

  return {
    id: created.id,
    remindAt: new Date(created.remindAt),
  };
}
