import type { GoogleCalendarEventWire } from "@/lib/events/google-calendar-ingest";

const GCAL_API = "https://www.googleapis.com/calendar/v3";

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  primary?: boolean;
};

function gcalHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
}

export async function refreshGoogleAccessToken(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ access_token: string; expires_in?: number }> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(json.error ?? "Google token refresh failed");
  }

  return {
    access_token: json.access_token,
    expires_in: json.expires_in,
  };
}

export async function listGoogleCalendars(
  accessToken: string,
): Promise<GoogleCalendarListItem[]> {
  const response = await fetch(`${GCAL_API}/users/me/calendarList?minAccessRole=reader`, {
    headers: gcalHeaders(accessToken),
  });

  const json = (await response.json()) as {
    items?: GoogleCalendarListItem[];
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? "Failed to list Google calendars");
  }

  return json.items ?? [];
}

export async function listGoogleCalendarEvents(input: {
  accessToken: string;
  calendarId?: string;
  timeMin: string;
  timeMax: string;
  maxResults?: number;
}): Promise<GoogleCalendarEventWire[]> {
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: input.timeMin,
    timeMax: input.timeMax,
    maxResults: String(input.maxResults ?? 50),
  });

  const response = await fetch(
    `${GCAL_API}/calendars/${calendarId}/events?${params.toString()}`,
    { headers: gcalHeaders(input.accessToken) },
  );

  const json = (await response.json()) as {
    items?: GoogleCalendarEventWire[];
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? "Failed to list Google Calendar events");
  }

  return json.items ?? [];
}

export function googleCalendarSyncWindow(now = new Date()): {
  timeMin: string;
  timeMax: string;
} {
  const timeMin = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  return {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  };
}
