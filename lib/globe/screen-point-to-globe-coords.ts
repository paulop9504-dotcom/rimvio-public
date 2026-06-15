import type { GlobeInstance } from "globe.gl";

/** Screen point → lat/lng on the globe surface (globe.gl utility). */
export function screenPointToGlobeCoords(
  globe: GlobeInstance,
  root: HTMLElement,
  clientX: number,
  clientY: number,
): { lat: number; lng: number } | null {
  const rect = root.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const coords = globe.toGlobeCoords(x, y);
  if (
    !coords ||
    !Number.isFinite(coords.lat) ||
    !Number.isFinite(coords.lng)
  ) {
    return null;
  }
  return { lat: coords.lat, lng: coords.lng };
}
