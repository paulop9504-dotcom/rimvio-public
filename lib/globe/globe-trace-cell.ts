/** ~1.1 km grid cell for pioneer hints (no leaderboard). */
export function globeTraceCellKey(lat: number, lng: number): string {
  return `${Math.round(lat * 100)}:${Math.round(lng * 100)}`;
}

export function bboxForGlobeTraceQuery(input: {
  lat: number;
  lng: number;
  radiusM: number;
}): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const delta = input.radiusM / 111_000;
  const lngScale = Math.max(0.25, Math.cos((input.lat * Math.PI) / 180));
  const lngDelta = delta / lngScale;
  return {
    minLat: input.lat - delta,
    maxLat: input.lat + delta,
    minLng: input.lng - lngDelta,
    maxLng: input.lng + lngDelta,
  };
}
