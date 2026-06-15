import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import { buildSearchableExperienceIndex } from "@/lib/search/build-searchable-experience-index";
import { searchRelatedContext } from "@/lib/search/search-related-context";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { resolveTripPrepRecall } from "@/lib/plan-context/resolve-trip-prep-recall";
import { detectGpsDwellClusters } from "@/lib/location-ping/detect-gps-dwell-clusters";
import type { GpsPing } from "@/lib/location-ping/types";

const ARRIVAL_RADIUS_KM = 35;
const TRAVEL_WAS_FAR_KM = 80;

export type GpsArrivalRecallTrigger = "plan_arrival_memory" | "plan_arrival" | "dwell_memory";

export type GpsArrivalRecall = {
  trigger: GpsArrivalRecallTrigger;
  /** Floor 1 Replay — often a past experience. */
  recallEventId: string;
  /** L2.5 verify gate — usually today's active plan. */
  surfaceEventId: string | null;
  recallLine: string;
  placeLabel: string;
  sessionKey: string;
};

function isNearPlace(
  lat: number,
  lng: number,
  placeLabel: string,
  radiusKm = ARRIVAL_RADIUS_KM,
): boolean {
  const place = resolvePlaceCoordinates(placeLabel);
  return haversineKm(lat, lng, place.lat, place.lng) <= radiusKm;
}

function detectTravelArrivalToPlace(
  pings: readonly GpsPing[],
  placeLabel: string,
): { lat: number; lng: number; placeLabel: string } | null {
  if (pings.length < 2) {
    return null;
  }
  const recent = [...pings]
    .sort(
      (left, right) =>
        Date.parse(left.capturedAtIso) - Date.parse(right.capturedAtIso),
    )
    .slice(-5);
  const latest = recent[recent.length - 1]!;
  if (!isNearPlace(latest.lat, latest.lng, placeLabel)) {
    return null;
  }
  const earlier = recent[0]!;
  const target = resolvePlaceCoordinates(placeLabel);
  if (haversineKm(earlier.lat, earlier.lng, target.lat, target.lng) < TRAVEL_WAS_FAR_KM) {
    return null;
  }
  return { lat: latest.lat, lng: latest.lng, placeLabel };
}

function resolveArrivalAnchor(
  pings: readonly GpsPing[],
  now: Date,
): { lat: number; lng: number; placeLabel: string } | null {
  const clusters = detectGpsDwellClusters(pings, now);
  const closed = clusters[clusters.length - 1];
  if (closed) {
    return {
      lat: closed.lat,
      lng: closed.lng,
      placeLabel: closed.placeLabel,
    };
  }

  const sorted = [...pings].sort(
    (left, right) =>
      Date.parse(left.capturedAtIso) - Date.parse(right.capturedAtIso),
  );
  const latest = sorted[sorted.length - 1];
  if (!latest) {
    return null;
  }
  return {
    lat: latest.lat,
    lng: latest.lng,
    placeLabel: `${latest.lat.toFixed(3)}°, ${latest.lng.toFixed(3)}°`,
  };
}

function activePlanNear(
  events: readonly EventCandidate[],
  lat: number,
  lng: number,
): EventCandidate | null {
  const matches = events.filter((event) => {
    if (event.lifecycle === "archived") {
      return false;
    }
    const plan = readPlanContextFromEvent(event);
    const place = plan?.place?.trim() || event.place?.trim();
    if (!place) {
      return false;
    }
    return isNearPlace(lat, lng, place);
  });

  if (matches.length === 0) {
    return null;
  }

  const rank = (event: EventCandidate) => {
    if (event.lifecycle === "active") {
      return 3;
    }
    if (event.lifecycle === "scheduled") {
      return 2;
    }
    return 1;
  };

  return [...matches].sort((left, right) => rank(right) - rank(left))[0]!;
}

/**
 * GPS 도착 → RECALL projection.
 * High intensity at arrival; pairs with GPS dwell ingest + 맞아요 gate on surface plan.
 */
export function resolveGpsArrivalRecall(input: {
  pings: readonly GpsPing[];
  events: readonly EventCandidate[];
  now?: Date;
}): GpsArrivalRecall | null {
  const now = input.now ?? new Date();
  const anchor = resolveArrivalAnchor(input.pings, now);
  if (!anchor) {
    return null;
  }

  const activePlan = activePlanNear(input.events, anchor.lat, anchor.lng);
  if (activePlan) {
    const plan = readPlanContextFromEvent(activePlan);
    const place = plan?.place?.trim() || activePlan.place?.trim() || anchor.placeLabel;
    const travelArrival =
      place && !place.includes("°")
        ? detectTravelArrivalToPlace(input.pings, place)
        : null;

    if (!travelArrival && !anchor.placeLabel.includes("°")) {
      // Dwell-only near plan — still recall if cluster closed
      const clusters = detectGpsDwellClusters(input.pings, now);
      if (clusters.length === 0) {
        return null;
      }
    }

    const pastRecall = resolveTripPrepRecall({
      title: activePlan.title,
      place,
      peerDisplayName: plan?.peerDisplayName ?? undefined,
      events: input.events,
      excludeEventId: activePlan.id,
    });

    if (pastRecall) {
      return {
        trigger: "plan_arrival_memory",
        recallEventId: pastRecall.hit.eventId,
        surfaceEventId: activePlan.id,
        recallLine: `도착 · ${pastRecall.recallLine}`,
        placeLabel: place,
        sessionKey: place.toLowerCase(),
      };
    }

    return {
      trigger: "plan_arrival",
      recallEventId: activePlan.id,
      surfaceEventId: activePlan.id,
      recallLine: `도착 · ${place}`,
      placeLabel: place,
      sessionKey: place.toLowerCase(),
    };
  }

  if (anchor.placeLabel.includes("°")) {
    return null;
  }

  const index = buildSearchableExperienceIndex(input.events, now);
  const hits = searchRelatedContext(index, anchor.placeLabel, 1);
  const hit = hits[0];
  if (!hit) {
    return null;
  }

  return {
    trigger: "dwell_memory",
    recallEventId: hit.eventId,
    surfaceEventId: hit.eventId,
    recallLine: `도착 · ${anchor.placeLabel}에서 비슷한 경험이 있어요`,
    placeLabel: anchor.placeLabel,
    sessionKey: anchor.placeLabel.toLowerCase(),
  };
}
