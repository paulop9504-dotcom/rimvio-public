import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import {
  googleCalendarEventToWire,
  type GoogleCalendarEventWire,
} from "@/lib/events/google-calendar-ingest";
import {
  googleCalendarSyncWindow,
  listGoogleCalendarEvents,
  refreshGoogleAccessToken,
} from "@/lib/google-calendar/api";
import { readIntegrationSecretForUser, upsertIntegrationForUser } from "@/lib/integrations/integrations-server-store";
import {
  readOAuthClientCredentials,
  isOAuthProviderConfigured,
} from "@/lib/integrations/oauth-providers";
import { tryCreateClient } from "@/lib/supabase/server";

async function resolveAccessToken(userId: string): Promise<string | null> {
  const supabase = await tryCreateClient();
  if (!supabase) {
    return null;
  }

  const secret = await readIntegrationSecretForUser(supabase, userId, "google_calendar");
  if (!secret?.access_token) {
    return null;
  }

  let accessToken = secret.access_token;

  if (secret.refresh_token && isOAuthProviderConfigured("google_calendar")) {
    const creds = readOAuthClientCredentials("google_calendar");
    if (creds) {
      try {
        const refreshed = await refreshGoogleAccessToken({
          refreshToken: secret.refresh_token,
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
        });
        accessToken = refreshed.access_token;
        await upsertIntegrationForUser(supabase, {
          userId,
          provider: "google_calendar",
          authKind: "oauth",
          secret: {
            ...secret,
            access_token: refreshed.access_token,
          },
          label: "Google Calendar",
        });
      } catch {
        /* use existing access token */
      }
    }
  }

  return accessToken;
}

export async function POST() {
  if (!isOAuthProviderConfigured("google_calendar")) {
    return NextResponse.json(
      {
        error: "Google Calendar OAuth is not configured.",
        code: "oauth_not_configured",
      },
      { status: 503 },
    );
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Login required.", code: "auth_required" },
      { status: 401 },
    );
  }

  const accessToken = await resolveAccessToken(userId);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google Calendar not connected.", code: "not_connected" },
      { status: 401 },
    );
  }

  const { timeMin, timeMax } = googleCalendarSyncWindow();
  const calendarId = "primary";

  try {
    const events = await listGoogleCalendarEvents({
      accessToken,
      calendarId,
      timeMin,
      timeMax,
    });

    const wires = events
      .map((event: GoogleCalendarEventWire) => googleCalendarEventToWire(event, calendarId))
      .filter((wire): wire is NonNullable<typeof wire> => wire !== null);

    return NextResponse.json({
      synced: wires.length,
      wires,
      calendarId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
