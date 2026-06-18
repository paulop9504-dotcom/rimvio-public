import type { EventCandidate } from "@/lib/events/event-candidate";
import { listEventCandidates } from "@/lib/events/event-store";
import { resolveSpacetimeFeedTarget } from "@/lib/feed/resolve-spacetime-feed-target";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Link sealed dwell moment to an active travel Creation Context when spacetime fits. */
export function resolveParentTravelContextEventId(
  event: EventCandidate,
): string | null {
  const lat =
    readFiniteCoord(event.metadata?.gpsDwellLat) ??
    readFiniteCoord(event.metadata?.globePlaceLat);
  const lng =
    readFiniteCoord(event.metadata?.gpsDwellLng) ??
    readFiniteCoord(event.metadata?.globePlaceLng);
  const capturedAtIso = event.datetime?.trim();
  if (lat == null || lng == null || !capturedAtIso) {
    return null;
  }

  const match = resolveSpacetimeFeedTarget({
    capturedAtIso,
    lat,
    lng,
    placeLabel: event.place?.trim() || event.metadata?.gpsDwellPlaceLabel?.toString() || null,
    events: listEventCandidates().filter((row) => row.id !== event.id),
  });
  if (!match) {
    return null;
  }

  const parent = listEventCandidates().find((row) => row.id === match.eventId);
  if (!parent) {
    return null;
  }
  if (parent.category !== "travel" && parent.metadata?.feedPlanEnabled !== true) {
    return null;
  }
  const plan = readPlanContextFromEvent(parent);
  if (!plan && parent.category !== "travel") {
    return null;
  }
  return parent.id;
}

export function isEventWithinPrepWindow(
  event: EventCandidate,
  now = new Date(),
): boolean {
  const startMs = parseIsoMs(event.datetime ?? null);
  if (startMs === null) {
    return false;
  }
  const deltaMs = startMs - now.getTime();
  return deltaMs <= 36 * 60 * 60 * 1000 && deltaMs >= -6 * 60 * 60 * 1000;
}
