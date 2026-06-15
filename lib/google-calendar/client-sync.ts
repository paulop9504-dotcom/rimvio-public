"use client";

import type { EventCandidateWire } from "@/lib/events/event-candidate";
import { commitEventWireFromApi } from "@/lib/source-of-truth/commit-truth";

export type GoogleCalendarSyncResult = {
  synced: number;
  wires: EventCandidateWire[];
  calendarId: string;
};

export async function fetchGoogleCalendarSync(): Promise<GoogleCalendarSyncResult> {
  const response = await fetch("/api/integrations/google-calendar/sync", {
    method: "POST",
    cache: "no-store",
  });

  const json = (await response.json()) as GoogleCalendarSyncResult & {
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    if (json.code === "not_connected") {
      throw new Error("Google Calendar 연결이 필요해요.");
    }
    throw new Error(json.error ?? "Google Calendar 동기화에 실패했습니다.");
  }

  return json;
}

/** Pull from API → commit-truth (client Event SSOT). */
export async function syncGoogleCalendarToEventStore(): Promise<number> {
  const result = await fetchGoogleCalendarSync();
  let count = 0;

  for (const wire of result.wires) {
    const committed = commitEventWireFromApi(wire);
    if (committed) {
      count += 1;
    }
  }

  return count;
}
