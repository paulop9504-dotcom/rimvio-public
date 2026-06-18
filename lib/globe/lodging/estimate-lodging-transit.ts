import { haversineKm } from "@/lib/feed/spacetime-fit";

const WALK_KMH = 5;
const TAXI_KMH = 23;

export type LodgingTransitEstimate = {
  distanceKm: number;
  walkMinutes: number;
  taxiMinutes: number;
  taxiFareKrw: number;
  taxiFareYen: number;
};

export function estimateLodgingTransit(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): LodgingTransitEstimate {
  const distanceKm = haversineKm(fromLat, fromLng, toLat, toLng);
  const walkMinutes = Math.max(2, Math.round((distanceKm / WALK_KMH) * 60));
  const taxiMinutes = Math.max(5, Math.round((distanceKm / TAXI_KMH) * 60));
  const taxiFareKrw = Math.round(4800 + Math.max(0, distanceKm - 1) * 980);
  const taxiFareYen = Math.round(700 + distanceKm * 350);
  return {
    distanceKm,
    walkMinutes,
    taxiMinutes,
    taxiFareKrw,
    taxiFareYen,
  };
}

export function formatWalkMinutesLabel(minutes: number): string {
  if (minutes >= 60) {
    return "1시간+";
  }
  return `${minutes}분`;
}
