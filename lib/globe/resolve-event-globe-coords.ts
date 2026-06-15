import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { parseGpsDwellClusterIdCoords } from "@/lib/globe/parse-gps-dwell-cluster-id";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readGpsAnchorFromEvent(
  event: EventCandidate,
): { lat: number; lng: number; placeLabel: string } | null {
  const meta = event.metadata ?? {};
  const dwellLat = readFiniteCoord(meta.gpsDwellLat);
  const dwellLng = readFiniteCoord(meta.gpsDwellLng);
  if (dwellLat !== null && dwellLng !== null) {
    const label =
      (typeof meta.gpsDwellPlaceLabel === "string" && meta.gpsDwellPlaceLabel.trim()) ||
      event.place?.trim() ||
      event.title.trim() ||
      "체류";
    return { lat: dwellLat, lng: dwellLng, placeLabel: label };
  }

  for (const fragment of readFeedCaptureFragments(event)) {
    if (fragment.kind !== "gps_dwell") {
      continue;
    }
    const coords = parseGpsDwellClusterIdCoords(fragment.id);
    if (!coords) {
      continue;
    }
    const label =
      fragment.placeLabel?.trim() ||
      event.place?.trim() ||
      event.title.trim() ||
      "체류";
    return { ...coords, placeLabel: label };
  }

  return null;
}

export function resolveEventGlobeCoords(event: EventCandidate): {
  lat: number;
  lng: number;
  placeLabel: string;
} {
  const meta = event.metadata ?? {};
  const confirmedLat = readFiniteCoord(meta.globePlaceLat);
  const confirmedLng = readFiniteCoord(meta.globePlaceLng);
  if (meta.globePlaceConfirmed === true && confirmedLat !== null && confirmedLng !== null) {
    const label =
      (typeof meta.globePlaceLabel === "string" && meta.globePlaceLabel.trim()) ||
      event.place?.trim() ||
      event.title.trim();
    return {
      lat: confirmedLat,
      lng: confirmedLng,
      placeLabel: label,
    };
  }

  const gpsAnchor = readGpsAnchorFromEvent(event);
  if (gpsAnchor) {
    return gpsAnchor;
  }

  const plan = readPlanContextFromEvent(event);
  const place = plan?.place?.trim() || event.place?.trim() || event.title.trim();
  const coords = resolvePlaceCoordinates(place || "한국");
  return {
    lat: coords.lat,
    lng: coords.lng,
    placeLabel: coords.label,
  };
}
