import {
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  type Client,
  type Guild,
} from "discord.js";
import {
  getCalendarSync,
  listCalendarSyncForGuild,
  upsertCalendarSync,
} from "../../../db/calendarEventsRepo.js";
import { listGuildSettings } from "../../../db/guildSettingsRepo.js";
import { sendGuildChannelMessage } from "../../../shared/announce.js";
import { startIntervalWorker } from "../../../shared/intervalWorker.js";
import {
  mapGoogleEventToDiscord,
  type DiscordEventPayload,
} from "./calendarMapper.js";
import {
  calendarAuthConfigured,
  listUpcomingGoogleEvents,
} from "./googleCalendarClient.js";

const CALENDAR_POLL_MS = 5 * 60 * 1000;

let stopHandle: (() => void) | null = null;
let running = false;

async function syncGuildCalendar(
  client: Client,
  guildId: string,
  calendarId: string,
  announceChannelId: string | null,
): Promise<void> {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    return;
  }

  const events = await listUpcomingGoogleEvents(calendarId);
  const seenIds = new Set<string>();

  for (const googleEvent of events) {
    const mapped = mapGoogleEventToDiscord(googleEvent);
    if (!mapped) {
      continue;
    }

    seenIds.add(mapped.googleEventId);
    const existing = await getCalendarSync(guildId, mapped.googleEventId);

    if (mapped.cancelled) {
      await cancelDiscordEvent(guild, existing?.discordEventId ?? null);
      await upsertCalendarSync({
        guildId,
        googleEventId: mapped.googleEventId,
        discordEventId: existing?.discordEventId ?? null,
        etag: mapped.etag,
        status: "cancelled",
      });
      continue;
    }

    if (existing?.etag && existing.etag === mapped.etag && existing.discordEventId) {
      continue;
    }

    const discordEventId = await upsertDiscordEvent(
      guild,
      mapped,
      existing?.discordEventId ?? null,
    );

    const isNew = !existing?.discordEventId;
    await upsertCalendarSync({
      guildId,
      googleEventId: mapped.googleEventId,
      discordEventId,
      etag: mapped.etag,
      status: "scheduled",
    });

    if (isNew && announceChannelId && discordEventId) {
      await sendGuildChannelMessage(client, announceChannelId, {
        content: `New calendar event: **${mapped.name}**\nStarts <t:${Math.floor(mapped.start.getTime() / 1000)}:F>`,
      }).catch(() => undefined);
    }
  }

  const known = await listCalendarSyncForGuild(guildId);
  for (const row of known) {
    if (seenIds.has(row.googleEventId) || row.status === "cancelled") {
      continue;
    }

    await cancelDiscordEvent(guild, row.discordEventId);
    await upsertCalendarSync({
      ...row,
      status: "cancelled",
    });
  }
}

async function upsertDiscordEvent(
  guild: Guild,
  mapped: DiscordEventPayload,
  existingDiscordEventId: string | null,
): Promise<string | null> {
  const payload = {
    name: mapped.name,
    description: mapped.description,
    scheduledStartTime: mapped.start,
    scheduledEndTime: mapped.end,
    privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
    entityType: GuildScheduledEventEntityType.External,
    entityMetadata: { location: mapped.location },
  };

  if (existingDiscordEventId) {
    const existing = await guild.scheduledEvents
      .fetch(existingDiscordEventId)
      .catch(() => null);
    if (existing) {
      await existing.edit(payload);
      return existing.id;
    }
  }

  const created = await guild.scheduledEvents.create(payload);
  return created.id;
}

async function cancelDiscordEvent(
  guild: Guild,
  discordEventId: string | null,
): Promise<void> {
  if (!discordEventId) {
    return;
  }

  const existing = await guild.scheduledEvents.fetch(discordEventId).catch(() => null);
  if (!existing) {
    return;
  }

  await existing.delete().catch(() => undefined);
}

async function tick(client: Client): Promise<void> {
  if (running || !calendarAuthConfigured()) {
    return;
  }

  running = true;
  try {
    const settings = await listGuildSettings();
    for (const guild of settings) {
      if (!guild.googleCalendarId) {
        continue;
      }

      try {
        await syncGuildCalendar(
          client,
          guild.guildId,
          guild.googleCalendarId,
          guild.calendarAnnounceChannelId,
        );
      } catch (error) {
        console.error(`Calendar sync failed for guild ${guild.guildId}:`, error);
      }
    }
  } catch (error) {
    console.error("Calendar worker failed:", error);
  } finally {
    running = false;
  }
}

export function startCalendarSyncWorker(client: Client): void {
  if (stopHandle || !calendarAuthConfigured()) {
    if (!calendarAuthConfigured()) {
      console.log("Calendar worker skipped: Google service account is not configured.");
    }
    return;
  }

  stopHandle = startIntervalWorker(() => tick(client), CALENDAR_POLL_MS);
}

export function stopCalendarSyncWorker(): void {
  stopHandle?.();
  stopHandle = null;
}
