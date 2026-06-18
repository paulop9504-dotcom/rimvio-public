import type { EventCandidate } from "@/lib/events/event-candidate";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import type { ContextResource } from "@/lib/globe/resource/types";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";

function syntheticLodgingHubRow(
  event: EventCandidate,
  resource: ContextResource,
): ContextHubServiceRow {
  return {
    serviceId: "lodging",
    labelKo: resource.label,
    shortLabelKo: resource.shortLabel ?? "숙소",
    implemented: true,
    offered: true,
    connected: true,
    link: {
      eventId: event.id,
      kind: "departure_airport",
      label: resource.label,
      shortLabel: resource.shortLabel ?? "숙소",
      airportIata: null,
      actionUrl: resource.action?.href ?? null,
      actionLabelKo: resource.action?.labelKo ?? "숙소 보기",
    },
    flightOptions: [],
    handoffHref: resource.action?.href ?? null,
    handoffLabelKo: resource.action?.labelKo ?? null,
  };
}

function scoreLodgingByGps(input: {
  resource: ContextResource;
  lat: number | null;
  lng: number | null;
}): number {
  let score = 60;
  const rLat = input.resource.spacetime.lat;
  const rLng = input.resource.spacetime.lng;
  if (
    input.lat == null ||
    input.lng == null ||
    rLat == null ||
    rLng == null ||
    !Number.isFinite(rLat) ||
    !Number.isFinite(rLng)
  ) {
    return score;
  }

  const distanceKm = haversineKm(input.lat, input.lng, rLat, rLng);
  if (distanceKm <= 1) {
    score += 120;
  } else if (distanceKm <= 3) {
    score += 95;
  } else if (distanceKm <= 8) {
    score += 55;
  } else if (distanceKm <= 15) {
    score += 20;
  }

  if (input.resource.metadata?.lodging && typeof input.resource.metadata.lodging === "object") {
    const lodging = input.resource.metadata.lodging as { videoUrl?: string | null };
    if (lodging.videoUrl) {
      score += 12;
    }
  }

  return score;
}

/** JIT rank for lodging inventory — GPS distance primary. */
export function rankLodgingResources(input: {
  event: EventCandidate;
  resources: readonly ContextResource[];
  lat?: number | null;
  lng?: number | null;
}): RankedContextResource[] {
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;

  return input.resources
    .map((resource) => {
      const hubRow = syntheticLodgingHubRow(input.event, resource);
      return {
        resource,
        hubRow,
        rankScore: scoreLodgingByGps({ resource, lat, lng }),
      };
    })
    .sort((left, right) => {
      const delta = right.rankScore - left.rankScore;
      if (delta !== 0) {
        return delta;
      }
      return left.resource.label.localeCompare(right.resource.label, "ko");
    });
}
