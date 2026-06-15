import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { deriveExperienceSlotHeadline } from "@/lib/feed/derive-experience-slot-headline";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import {
  normalizeMeaningPerson,
  normalizeMeaningPlace,
} from "@/lib/meaning/meaning-node-id";

export type RecallEventSnapshot = {
  eventId: string;
  title: string;
  headline: string;
  place: string | null;
  city: string | null;
  people: readonly string[];
  atIso: string | null;
  monthDay: string | null;
  year: number | null;
  gcalEventId: string | null;
  titleFingerprint: string;
  captureCount: number;
  lifecycle: EventCandidate["lifecycle"];
};

function readPeople(event: EventCandidate): string[] {
  const meta = event.metadata ?? {};
  const plan = readPlanContextFromEvent(event);
  const names = new Set<string>();

  for (const value of [
    plan?.peerDisplayName,
    typeof meta.peerDisplayName === "string" ? meta.peerDisplayName : null,
    typeof meta.planPeerDisplayName === "string" ? meta.planPeerDisplayName : null,
  ]) {
    const name = typeof value === "string" ? normalizeMeaningPerson(value) : "";
    if (name) {
      names.add(name);
    }
  }

  const attendees = meta.attendees;
  if (Array.isArray(attendees)) {
    for (const row of attendees) {
      if (typeof row === "string") {
        const name = normalizeMeaningPerson(row);
        if (name) {
          names.add(name);
        }
      }
    }
  }

  return [...names];
}

function titleFingerprint(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[0-9]{4}년?/gu, "")
    .replace(/day\s*[0-9]+/giu, "")
    .slice(0, 64);
}

function monthDayKey(iso: string | null | undefined): string | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return null;
  }
  const date = new Date(ms);
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${month}-${day}`;
}

/** Pure read — normalized recall matching fields per event. */
export function buildRecallEventSnapshot(
  event: EventCandidate,
  now = new Date(),
): RecallEventSnapshot {
  const plan = readPlanContextFromEvent(event);
  const placeRaw = plan?.place ?? event.place ?? null;
  const place = placeRaw ? normalizeMeaningPlace(placeRaw) : null;
  const city = place;
  const atIso = event.datetime ?? event.createdAt;
  const headline = deriveExperienceSlotHeadline({
    event,
    plan,
    fallbackHeadline: event.title,
    now,
  }).headline;

  const ms = atIso ? Date.parse(atIso) : NaN;
  const year = Number.isNaN(ms) ? null : new Date(ms).getUTCFullYear();

  const meta = event.metadata ?? {};

  return {
    eventId: event.id,
    title: event.title,
    headline,
    place,
    city,
    people: readPeople(event),
    atIso: atIso ?? null,
    monthDay: monthDayKey(atIso),
    year,
    gcalEventId:
      typeof meta.gcalEventId === "string" ? meta.gcalEventId.trim() : null,
    titleFingerprint: titleFingerprint(event.title),
    captureCount: readFeedCaptureFragments(event).length,
    lifecycle: event.lifecycle,
  };
}

export function buildRecallAnchorSnapshot(
  anchor: {
    eventId?: string | null;
    title?: string | null;
    place?: string | null;
    peerDisplayName?: string | null;
    datetimeIso?: string | null;
    gcalEventId?: string | null;
  },
): Omit<RecallEventSnapshot, "eventId" | "headline" | "captureCount" | "lifecycle"> & {
  eventId: string | null;
} {
  const people: string[] = [];
  const peer = anchor.peerDisplayName?.trim();
  if (peer) {
    people.push(normalizeMeaningPerson(peer));
  }

  const placeRaw = anchor.place?.trim() ?? null;
  const place = placeRaw ? normalizeMeaningPlace(placeRaw) : null;

  return {
    eventId: anchor.eventId?.trim() ?? null,
    title: anchor.title?.trim() ?? "",
    headline: anchor.title?.trim() ?? "",
    place,
    city: place,
    people,
    atIso: anchor.datetimeIso?.trim() ?? null,
    monthDay: monthDayKey(anchor.datetimeIso),
    year: anchor.datetimeIso
      ? new Date(Date.parse(anchor.datetimeIso)).getUTCFullYear()
      : null,
    gcalEventId: anchor.gcalEventId?.trim() ?? null,
    titleFingerprint: titleFingerprint(anchor.title ?? ""),
  };
}
