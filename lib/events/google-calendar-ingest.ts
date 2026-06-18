import { categoryFromScheduleTitle } from "@/lib/events/category-from-title";
import type {
  EventCandidate,
  EventCandidateUpsertInput,
  EventCandidateWire,
} from "@/lib/events/event-candidate";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export const GOOGLE_CALENDAR_SOURCE_REF = "google-calendar";

export type GoogleCalendarEventWire = {
  id: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  htmlLink?: string | null;
  status?: string | null;
  start?: { dateTime?: string | null; date?: string | null; timeZone?: string | null };
  end?: { dateTime?: string | null; date?: string | null };
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
  organizer?: { email?: string; displayName?: string };
};

export function eventIdForGoogleCalendar(gcalEventId: string): string {
  const safe = gcalEventId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return `ec-gcal-${safe}`;
}

export function parseGoogleCalendarStart(
  event: Pick<GoogleCalendarEventWire, "start">,
): string | undefined {
  const dateTime = event.start?.dateTime?.trim();
  if (dateTime) {
    return dateTime;
  }
  const date = event.start?.date?.trim();
  if (date) {
    return `${date}T09:00:00.000Z`;
  }
  return undefined;
}

export function googleCalendarEventToUpsert(
  event: GoogleCalendarEventWire,
  calendarId = "primary",
): EventCandidateUpsertInput | null {
  if (event.status === "cancelled") {
    return null;
  }

  const title = event.summary?.trim();
  const datetime = parseGoogleCalendarStart(event);
  if (!title || !datetime) {
    return null;
  }

  const place = event.location?.trim() || undefined;
  const attendeeLabels =
    event.attendees
      ?.map((row) => row.displayName?.trim() || row.email?.trim())
      .filter(Boolean)
      .slice(0, 8) ?? [];

  return {
    id: eventIdForGoogleCalendar(event.id),
    title,
    category: categoryFromScheduleTitle(`${title} ${place ?? ""}`),
    source: "system",
    lifecycle: "scheduled",
    datetime,
    place,
    confidence: 0.9,
    metadata: {
      sourceRef: GOOGLE_CALENDAR_SOURCE_REF,
      gcalEventId: event.id,
      gcalCalendarId: calendarId,
      htmlLink: event.htmlLink ?? null,
      description: event.description?.trim().slice(0, 500) ?? null,
      attendees: attendeeLabels,
      organizer: event.organizer?.displayName ?? event.organizer?.email ?? null,
    },
  };
}

export function googleCalendarEventToWire(
  event: GoogleCalendarEventWire,
  calendarId = "primary",
): EventCandidateWire | null {
  const upsert = googleCalendarEventToUpsert(event, calendarId);
  if (!upsert) {
    return null;
  }

  return {
    id: upsert.id!,
    title: upsert.title,
    category: upsert.category,
    source: upsert.source,
    lifecycle: upsert.lifecycle,
    datetime: upsert.datetime,
    place: upsert.place,
    confidence: upsert.confidence,
    metadata: upsert.metadata,
  };
}

export function ingestGoogleCalendarEvent(
  event: GoogleCalendarEventWire,
  calendarId = "primary",
): EventCandidate | null {
  const upsert = googleCalendarEventToUpsert(event, calendarId);
  if (!upsert) {
    return null;
  }
  return commitEventUpsert(upsert);
}

export function ingestGoogleCalendarEvents(
  events: readonly GoogleCalendarEventWire[],
  calendarId = "primary",
): EventCandidate[] {
  const committed: EventCandidate[] = [];
  for (const event of events) {
    const next = ingestGoogleCalendarEvent(event, calendarId);
    if (next) {
      committed.push(next);
    }
  }
  return committed;
}

export function isGoogleCalendarEvent(event: EventCandidate): boolean {
  return event.metadata?.sourceRef === GOOGLE_CALENDAR_SOURCE_REF;
}
