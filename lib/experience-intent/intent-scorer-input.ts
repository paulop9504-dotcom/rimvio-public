import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import {
  readDwellMinutesFromCaptures,
  readFeedCaptureFragments,
} from "@/lib/feed/feed-capture-metadata";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type IntentCalendarContext = {
  sourceRef: string | null;
  description: string | null;
  attendeeCount: number;
  attendeeLabels: readonly string[];
  organizer: string | null;
};

export type IntentScorerInput = {
  eventId: string;
  title: string;
  place: string | null;
  category: EventCandidate["category"];
  description: string | null;
  dwellMinutes: number | null;
  captures: readonly FeedCaptureFragment[];
  photoCount: number;
  videoCount: number;
  gpsDwellCaptureCount: number;
  distinctPlaceLabels: readonly string[];
  participantNames: readonly string[];
  peerThreadId: string | null;
  peerDisplayName: string | null;
  calendar: IntentCalendarContext | null;
  /** Concatenated searchable haystack for regex rules. */
  haystack: string;
};

function readStringMeta(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const raw = metadata[key];
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed || null;
}

function readAttendees(metadata: Record<string, unknown>): string[] {
  const raw = metadata.attendees;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((row) => (typeof row === "string" ? row.trim() : ""))
    .filter(Boolean)
    .slice(0, 24);
}

function readCalendarContext(
  metadata: Record<string, unknown>,
): IntentCalendarContext | null {
  const sourceRef = readStringMeta(metadata, "sourceRef");
  const isCalendar =
    sourceRef === "google-calendar" ||
    sourceRef === "chat-scheduled" ||
    Boolean(metadata.gcalEventId);
  if (!isCalendar && !metadata.description && !metadata.attendees) {
    return null;
  }

  const attendees = readAttendees(metadata);
  return {
    sourceRef,
    description: readStringMeta(metadata, "description"),
    attendeeCount: attendees.length,
    attendeeLabels: attendees,
    organizer:
      readStringMeta(metadata, "organizer") ??
      readStringMeta(metadata, "organizerEmail"),
  };
}

function distinctPlaceLabels(
  captures: readonly FeedCaptureFragment[],
  place: string | null,
): string[] {
  const labels = new Set<string>();
  if (place?.trim()) {
    labels.add(place.trim());
  }
  for (const capture of captures) {
    if (capture.placeLabel?.trim()) {
      labels.add(capture.placeLabel.trim());
    }
  }
  return [...labels];
}

/** Normalize EventCandidate → scorer input. Pure read. */
export function buildIntentScorerInput(event: EventCandidate): IntentScorerInput {
  const meta = event.metadata ?? {};
  const plan = readPlanContextFromEvent(event);
  const captures = readFeedCaptureFragments(event);
  const description =
    readStringMeta(meta, "description") ??
    readStringMeta(meta, "calendarDescription") ??
    null;

  const participantNames = [
    plan?.peerDisplayName,
    readStringMeta(meta, "peerDisplayName"),
    readStringMeta(meta, "planPeerDisplayName"),
    ...readAttendees(meta),
  ].filter((value): value is string => Boolean(value?.trim()));

  const calendar = readCalendarContext(meta);
  const places = distinctPlaceLabels(captures, event.place ?? null);

  const haystack = [
    event.title,
    event.place,
    description,
    event.category,
    ...places,
    ...participantNames,
    calendar?.organizer,
    ...(calendar?.attendeeLabels ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    eventId: event.id,
    title: event.title,
    place: event.place?.trim() ?? null,
    category: event.category,
    description,
    dwellMinutes: readDwellMinutesFromCaptures(event),
    captures,
    photoCount: captures.filter((row) => row.kind === "photo").length,
    videoCount: captures.filter((row) => row.kind === "video").length,
    gpsDwellCaptureCount: captures.filter((row) => row.kind === "gps_dwell").length,
    distinctPlaceLabels: places,
    participantNames: [...new Set(participantNames)],
    peerThreadId: plan?.peerThreadId?.trim() ?? readStringMeta(meta, "planPeerThreadId"),
    peerDisplayName: plan?.peerDisplayName ?? null,
    calendar,
    haystack,
  };
}
