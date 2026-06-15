import type { EventCandidate } from "@/lib/events/event-candidate";
import { hasPendingFeedCaptureVerify, readDwellMinutesFromCaptures } from "@/lib/feed/feed-capture-metadata";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { isGlobeLocationConfirmed } from "@/lib/globe/globe-location-confirm-store";
import { readGlobePhotoPlaceSuggest } from "@/lib/globe/read-globe-photo-place-suggest";

export type PendingGlobeLocationConfirmKind = "gps_dwell" | "photo_place";

export type PendingGlobeLocationConfirm = {
  eventId: string;
  title: string;
  place: string;
  datetime: string;
  kind: PendingGlobeLocationConfirmKind;
  /** Accumulated gps_dwell minutes for the day. */
  dwellMinutes?: number;
};

function pushPendingConfirm(
  out: PendingGlobeLocationConfirm[],
  event: EventCandidate,
  input: {
    place: string;
    kind: PendingGlobeLocationConfirmKind;
  },
) {
  out.push({
    eventId: event.id,
    title: event.title?.trim() || "체류 기록",
    place: input.place,
    datetime: event.datetime,
    kind: input.kind,
    dwellMinutes:
      input.kind === "gps_dwell"
        ? (readDwellMinutesFromCaptures(event) ?? undefined)
        : undefined,
  });
}

/** GPS dwell + photo place suggestions awaiting human confirm on globe. */
export function listPendingGlobeLocationConfirms(input?: {
  dismissedIds?: readonly string[];
  gpsEnabled?: boolean;
}): PendingGlobeLocationConfirm[] {
  if (input?.gpsEnabled === false) {
    return [];
  }

  const dismissed = new Set(input?.dismissedIds ?? []);
  const out: PendingGlobeLocationConfirm[] = [];

  for (const event of listLifeEventCandidates()) {
    if (!hasPendingFeedCaptureVerify(event)) {
      continue;
    }
    if (dismissed.has(event.id)) {
      continue;
    }

    if (event.metadata?.targetingSource === "photo_place_suggest") {
      const suggest = readGlobePhotoPlaceSuggest(event);
      const place = suggest?.placeName ?? event.place?.trim();
      if (!place) {
        continue;
      }
      if (isGlobeLocationConfirmed(place, event.datetime)) {
        continue;
      }
      pushPendingConfirm(out, event, { place, kind: "photo_place" });
      continue;
    }

    if (event.metadata?.targetingSource !== "gps_background") {
      continue;
    }

    const place = event.place?.trim();
    if (place && isGlobeLocationConfirmed(place, event.datetime)) {
      continue;
    }
    pushPendingConfirm(out, event, {
      place: place || "이 위치",
      kind: "gps_dwell",
    });
  }

  return out;
}

export function isPendingGlobeLocationEvent(
  event: EventCandidate,
  dismissedIds: readonly string[],
): boolean {
  return listPendingGlobeLocationConfirms({ dismissedIds }).some(
    (row) => row.eventId === event.id,
  );
}
