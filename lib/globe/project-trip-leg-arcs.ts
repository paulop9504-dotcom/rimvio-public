import type { EventCandidate } from "@/lib/events/event-candidate";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { readTripLegFromEvent } from "@/lib/globe/trip-leg-metadata";

export type GlobeTripArc = {
  id: string;
  tripRef: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
};

export type TripLegBarProjection = {
  tripRef: string;
  originLabel: string;
  destinationLabel: string;
  activeLeg: "departure" | "destination";
  departWhenLabel: string | null;
};

function clusterByEventId(
  clusters: readonly PinCluster[],
): ReadonlyMap<string, PinCluster> {
  return new Map(clusters.map((row) => [row.eventId, row]));
}

/** Great-circle arcs between departure ↔ destination legs of the same trip. */
export function projectTripLegArcs(input: {
  eventsById: ReadonlyMap<string, EventCandidate>;
  clusters: readonly PinCluster[];
}): GlobeTripArc[] {
  const clusterMap = clusterByEventId(input.clusters);
  const arcs: GlobeTripArc[] = [];
  const seen = new Set<string>();

  for (const event of input.eventsById.values()) {
    const leg = readTripLegFromEvent(event);
    if (!leg || leg.leg !== "departure" || !leg.linkedEventId) {
      continue;
    }
    if (seen.has(leg.tripRef)) {
      continue;
    }

    const destinationEvent = input.eventsById.get(leg.linkedEventId);
    const destinationLeg = readTripLegFromEvent(destinationEvent);
    if (!destinationEvent || destinationLeg?.leg !== "destination") {
      continue;
    }

    const from = clusterMap.get(event.id);
    const to = clusterMap.get(destinationEvent.id);
    if (!from || !to) {
      continue;
    }

    seen.add(leg.tripRef);
    arcs.push({
      id: `trip-arc:${leg.tripRef}`,
      tripRef: leg.tripRef,
      startLat: from.lat,
      startLng: from.lng,
      endLat: to.lat,
      endLng: to.lng,
      color: GLOBE_TOSS_THEME.blue,
    });
  }

  return arcs;
}

export function projectTripLegBar(input: {
  event: EventCandidate | null | undefined;
  eventsById: ReadonlyMap<string, EventCandidate>;
  clusters: readonly PinCluster[];
}): TripLegBarProjection | null {
  const event = input.event;
  if (!event) {
    return null;
  }
  const leg = readTripLegFromEvent(event);
  if (!leg) {
    return null;
  }

  const clusterMap = clusterByEventId(input.clusters);
  const self = clusterMap.get(event.id);
  const linkedId = leg.linkedEventId;
  const linked = linkedId ? input.eventsById.get(linkedId) : null;
  const linkedCluster = linkedId ? clusterMap.get(linkedId) : null;

  let originLabel = "출발지";
  let destinationLabel = "도착지";

  if (leg.leg === "departure") {
    originLabel = self?.placeLabel ?? event.place?.trim() ?? originLabel;
    destinationLabel =
      linkedCluster?.placeLabel ?? linked?.place?.trim() ?? destinationLabel;
  } else {
    destinationLabel = self?.placeLabel ?? event.place?.trim() ?? destinationLabel;
    originLabel =
      linkedCluster?.placeLabel ?? linked?.place?.trim() ?? originLabel;
  }

  const departEvent =
    leg.leg === "departure" ? event : linked ?? null;
  const departWhenLabel = departEvent?.datetime
    ? formatDepartWhen(departEvent.datetime)
    : null;

  return {
    tripRef: leg.tripRef,
    originLabel,
    destinationLabel,
    activeLeg: leg.leg,
    departWhenLabel,
  };
}

function formatDepartWhen(datetimeIso: string): string | null {
  const ms = Date.parse(datetimeIso);
  if (Number.isNaN(ms)) {
    return null;
  }
  const days = Math.ceil((ms - Date.now()) / 86_400_000);
  if (days > 1) {
    return `D-${days}`;
  }
  if (days === 1) {
    return "내일 출발";
  }
  if (days === 0) {
    return "오늘 출발";
  }
  return null;
}
