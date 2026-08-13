import { JWT } from "google-auth-library";
import { env } from "../../../env.js";
import {
  parseServiceAccountJson,
  type GoogleCalendarEvent,
} from "./calendarMapper.js";

interface GoogleEventsResponse {
  items?: GoogleCalendarEvent[];
}

export function calendarAuthConfigured(): boolean {
  return Boolean(parseServiceAccountJson(env.GOOGLE_SERVICE_ACCOUNT_JSON));
}

async function getAccessToken(): Promise<string> {
  const account = parseServiceAccountJson(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (!account?.client_email || !account.private_key) {
    throw new Error("Google service account JSON is missing or invalid.");
  }

  const auth = new JWT({
    email: account.client_email,
    key: account.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  const token = await auth.getAccessToken();
  if (!token.token) {
    throw new Error("Failed to obtain Google Calendar access token.");
  }

  return token.token;
}

export async function listUpcomingGoogleEvents(
  calendarId: string,
  now = new Date(),
): Promise<GoogleCalendarEvent[]> {
  const token = await getAccessToken();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
  );
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("maxResults", "50");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar request failed with status ${response.status}`);
  }

  const body = (await response.json()) as GoogleEventsResponse;
  return body.items ?? [];
}
