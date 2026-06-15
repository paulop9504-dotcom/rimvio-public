import { listSearchActivitiesSync } from "@/lib/location-memory/search-activity-log";

function haversineKm(
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

export function formatCoordsPlaceLabel(lat: number, lng: number): string {
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}

/** Prefer a recent search-memory label when it is close to the ping. */
export function resolvePlaceLabelNearCoords(
  lat: number,
  lng: number,
): string {
  const activities = listSearchActivitiesSync(80);
  let bestLabel: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entry of activities) {
    if (entry.lat === null || entry.lng === null) {
      continue;
    }
    const label = entry.place_label?.trim() || entry.region_label?.trim();
    if (!label) {
      continue;
    }
    const distance = haversineKm(lat, lng, entry.lat, entry.lng);
    if (distance <= 8 && distance < bestDistance) {
      bestLabel = label;
      bestDistance = distance;
    }
  }

  return bestLabel ?? formatCoordsPlaceLabel(lat, lng);
}
