function haversineKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Urban short-trip estimate — feeds leave-time style copy. */
export function estimatePlaceTravelMinutes(input: {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}): number {
  const km = haversineKm(input.from, input.to);
  if (km <= 0.3) {
    return Math.max(3, Math.round(km * 12));
  }
  if (km <= 1.5) {
    return Math.max(5, Math.round(km * 8));
  }
  return Math.max(8, Math.round(km * 5));
}

export function formatArrivalClock(travelMinutes: number, now = new Date()): string {
  const arrive = new Date(now.getTime() + travelMinutes * 60_000);
  return arrive.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
