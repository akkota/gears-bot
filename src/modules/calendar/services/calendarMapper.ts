export interface GoogleServiceAccountJson {
  client_email?: string;
  private_key?: string;
}

export function parseServiceAccountJson(
  raw: string | undefined,
): GoogleServiceAccountJson | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as GoogleServiceAccountJson;
    if (!parsed.client_email || !parsed.private_key) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface GoogleCalendarEvent {
  id?: string;
  etag?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export interface DiscordEventPayload {
  googleEventId: string;
  etag: string | null;
  name: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  cancelled: boolean;
}

function parseGoogleDate(
  value: { dateTime?: string; date?: string } | undefined,
  fallback?: Date,
): Date | null {
  if (value?.dateTime) {
    const parsed = new Date(value.dateTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value?.date) {
    const parsed = new Date(`${value.date}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return fallback ?? null;
}

export function mapGoogleEventToDiscord(
  event: GoogleCalendarEvent,
): DiscordEventPayload | null {
  if (!event.id) {
    return null;
  }

  const cancelled = event.status === "cancelled";
  const start = parseGoogleDate(event.start);
  if (!start && !cancelled) {
    return null;
  }

  const resolvedStart = start ?? new Date();
  const end =
    parseGoogleDate(event.end, new Date(resolvedStart.getTime() + 60 * 60 * 1000)) ??
    new Date(resolvedStart.getTime() + 60 * 60 * 1000);

  const location =
    event.location?.trim() ||
    event.hangoutLink?.trim() ||
    event.htmlLink?.trim() ||
    "See Google Calendar";

  return {
    googleEventId: event.id,
    etag: event.etag ?? null,
    name: (event.summary?.trim() || "ESW event").slice(0, 100),
    description: (event.description?.trim() || "Synced from the ESW Google Calendar.").slice(
      0,
      1000,
    ),
    location: location.slice(0, 100),
    start: resolvedStart,
    end,
    cancelled,
  };
}
