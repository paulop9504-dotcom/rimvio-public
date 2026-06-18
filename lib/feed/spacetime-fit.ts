import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";

const TIME_PAD_MS = 6 * 60 * 60 * 1000;
const MAX_PLACE_KM = 25;

export function parseIsoMs(iso?: string | null): number | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function placeLabelsOverlap(
  eventPlace?: string | null,
  capturedPlace?: string | null,
): boolean {
  const event = eventPlace?.trim();
  const captured = capturedPlace?.trim();
  if (!event || !captured) {
    return false;
  }
  if (event.includes(captured) || captured.includes(event)) {
    return true;
  }
  const eventCoords = resolvePlaceCoordinates(event);
  const capturedCoords = resolvePlaceCoordinates(captured);
  return eventCoords.label === capturedCoords.label;
}

export type SpacetimeFitResult = {
  fits: boolean;
  score: number;
  timeOk: boolean;
  placeOk: boolean;
  distanceKm: number | null;
};

/** Pure — does capture spacetime fit an event window + place? */
export function scoreSpacetimeFit(input: {
  capturedAtIso: string;
  lat: number | null;
  lng: number | null;
  eventStartIso: string;
  eventEndIso?: string | null;
  eventPlace?: string | null;
  eventLat?: number | null;
  eventLng?: number | null;
  capturedPlaceLabel?: string | null;
}): SpacetimeFitResult {
  const capturedMs = parseIsoMs(input.capturedAtIso);
  const startMs = parseIsoMs(input.eventStartIso);
  const endMs = parseIsoMs(input.eventEndIso) ?? startMs;

  if (capturedMs === null || startMs === null) {
    return { fits: false, score: 0, timeOk: false, placeOk: false, distanceKm: null };
  }

  const windowStart = startMs - TIME_PAD_MS;
  const windowEnd = (endMs ?? startMs) + TIME_PAD_MS;
  const timeOk = capturedMs >= windowStart && capturedMs <= windowEnd;

  let placeOk = false;
  let distanceKm: number | null = null;

  if (placeLabelsOverlap(input.eventPlace, input.capturedPlaceLabel)) {
    placeOk = true;
    distanceKm = 0;
  } else if (
    input.lat !== null &&
    input.lng !== null &&
    input.eventLat != null &&
    input.eventLng != null &&
    Number.isFinite(input.eventLat) &&
    Number.isFinite(input.eventLng)
  ) {
    distanceKm = haversineKm(input.lat, input.lng, input.eventLat, input.eventLng);
    placeOk = distanceKm <= MAX_PLACE_KM;
  } else if (input.lat !== null && input.lng !== null && input.eventPlace?.trim()) {
    const coords = resolvePlaceCoordinates(input.eventPlace);
    distanceKm = haversineKm(input.lat, input.lng, coords.lat, coords.lng);
    placeOk = distanceKm <= MAX_PLACE_KM;
  } else if (!input.eventPlace?.trim()) {
    placeOk = input.lat !== null || Boolean(input.capturedPlaceLabel?.trim());
  } else {
    placeOk = input.lat === null && input.lng === null;
  }

  const fits = timeOk && placeOk;
  let score = 0;
  if (timeOk) {
    score += 0.55;
  }
  if (placeOk) {
    score += 0.35;
  }
  if (distanceKm !== null && distanceKm <= 5) {
    score += 0.1;
  }

  return { fits, score, timeOk, placeOk, distanceKm };
}
