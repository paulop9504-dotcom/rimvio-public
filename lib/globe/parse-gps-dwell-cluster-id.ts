/** Parse lat/lng embedded in `gps-dwell:{startMs}:{latMilli}:{lngMilli}` ids. */
export function parseGpsDwellClusterIdCoords(
  clusterId: string,
): { lat: number; lng: number } | null {
  const parts = clusterId.trim().split(":");
  if (parts[0] !== "gps-dwell" || parts.length < 4) {
    return null;
  }

  const latMilli = Number(parts[parts.length - 2]);
  const lngMilli = Number(parts[parts.length - 1]);
  if (!Number.isFinite(latMilli) || !Number.isFinite(lngMilli)) {
    return null;
  }

  const lat = latMilli / 1000;
  const lng = lngMilli / 1000;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}
