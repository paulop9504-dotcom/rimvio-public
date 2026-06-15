import { resolveExperienceIntent } from "@/lib/experience-intent/resolve-experience-intent";
import type { ExperienceIntent } from "@/lib/experience-intent/experience-intent-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  readDwellMinutesFromCaptures,
  readFeedCaptureFragments,
} from "@/lib/feed/feed-capture-metadata";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import {
  normalizeMeaningExperience,
  normalizeMeaningPerson,
  normalizeMeaningPlace,
} from "@/lib/meaning/meaning-node-id";

export type MeaningObservation = {
  eventId: string;
  atIso: string;
  people: readonly string[];
  places: readonly string[];
  experienceKey: string;
  intent: ExperienceIntent;
  dwellMinutes: number;
  verifyCount: number;
};

function readAttendeeNames(metadata: Record<string, unknown>): string[] {
  const raw = metadata.attendees;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((row): row is string => typeof row === "string")
    .map((row) => normalizeMeaningPerson(row))
    .filter(Boolean);
}

function collectPeople(event: EventCandidate): string[] {
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

  for (const attendee of readAttendeeNames(meta)) {
    names.add(attendee);
  }

  return [...names];
}

function collectPlaces(event: EventCandidate): string[] {
  const plan = readPlanContextFromEvent(event);
  const places = new Set<string>();

  for (const value of [plan?.place, event.place]) {
    const place = typeof value === "string" ? normalizeMeaningPlace(value) : "";
    if (place) {
      places.add(place);
    }
  }

  for (const capture of readFeedCaptureFragments(event)) {
    const place = capture.placeLabel
      ? normalizeMeaningPlace(capture.placeLabel)
      : "";
    if (place) {
      places.add(place);
    }
  }

  return [...places];
}

function countVerifiedCaptures(event: EventCandidate): number {
  return readFeedCaptureFragments(event).filter((row) => row.verified === true).length;
}

/** Pure read — one observation row per committed experience event. */
export function extractMeaningObservations(
  events: readonly EventCandidate[],
): MeaningObservation[] {
  const rows: MeaningObservation[] = [];

  for (const event of events) {
    if (event.lifecycle === "archived") {
      continue;
    }

    const people = collectPeople(event);
    const places = collectPlaces(event);
    const captures = readFeedCaptureFragments(event);
    const hasSignal =
      people.length > 0 ||
      places.length > 0 ||
      captures.length > 0 ||
      Boolean(event.place?.trim());

    if (!hasSignal) {
      continue;
    }

    const resolution = resolveExperienceIntent(event);
    const experienceKey = normalizeMeaningExperience({
      intent: resolution.intent,
      title: event.title,
    });

    rows.push({
      eventId: event.id,
      atIso: event.datetime ?? event.updatedAt ?? event.createdAt,
      people,
      places,
      experienceKey,
      intent: resolution.intent,
      dwellMinutes: readDwellMinutesFromCaptures(event) ?? 0,
      verifyCount: countVerifiedCaptures(event),
    });
  }

  return rows;
}
