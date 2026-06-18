import type { TrafficContext } from "@/lib/context-resolver/types";
import { resolveSyncTrafficContext } from "@/lib/plan-context/resolve-sync-traffic-context";
import { isKakaoMobilityConfigured, kakaoRestApiKey } from "@/lib/traffic/kakao-mobility-config";
import {
  estimateTrafficFromCoordinates,
  resolvePlaceCoordinates,
} from "@/lib/traffic/resolve-place-coordinates";

type KakaoDirectionsSummary = {
  duration?: number;
  distance?: number;
};

type KakaoDirectionsRoute = {
  summary?: KakaoDirectionsSummary;
};

type KakaoDirectionsResponse = {
  routes?: KakaoDirectionsRoute[];
};

async function kakaoDirectionsMinutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<{ travel_minutes: number; delay_minutes: number; distance_label: string } | null> {
  const key = kakaoRestApiKey();
  if (!key) {
    return null;
  }

  const originParam = `${origin.lng},${origin.lat}`;
  const destParam = `${destination.lng},${destination.lat}`;
  const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${originParam}&destination=${destParam}&priority=RECOMMEND`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      next: { revalidate: 120 },
    });
    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as KakaoDirectionsResponse;
    const summary = json.routes?.[0]?.summary;
    const durationSec = summary?.duration;
    if (!durationSec || durationSec <= 0) {
      return null;
    }

    const travel_minutes = Math.max(1, Math.ceil(durationSec / 60));
    const distanceM = summary?.distance ?? 0;
    const freeFlowMinutes =
      distanceM > 0 ? Math.max(1, Math.round((distanceM / 1000 / 40) * 60)) : travel_minutes;
    const delay_minutes = Math.max(0, travel_minutes - freeFlowMinutes);
    const distanceKm = distanceM > 0 ? (distanceM / 1000).toFixed(1) : null;

    return {
      travel_minutes,
      delay_minutes,
      distance_label: distanceKm ? `약 ${distanceKm}km · 실시간 경로` : "실시간 경로",
    };
  } catch {
    return null;
  }
}

function heuristicFallback(destination: string, originHint?: string | null): TrafficContext {
  return resolveSyncTrafficContext(destination, originHint ?? "현재 위치");
}

/**
 * Server-side traffic resolve — Kakao Directions → geo estimate → keyword heuristic.
 */
export async function fetchTrafficContext(input: {
  destination: string;
  originHint?: string | null;
}): Promise<TrafficContext> {
  const destination = input.destination.trim();
  if (!destination) {
    return heuristicFallback("목적지", input.originHint);
  }

  const originQuery = input.originHint?.trim() || "현재 위치";
  const [originPoint, destPoint] = await Promise.all([
    resolvePlaceCoordinates(originQuery),
    resolvePlaceCoordinates(destination),
  ]);

  if (originPoint && destPoint) {
    if (isKakaoMobilityConfigured()) {
      const routed = await kakaoDirectionsMinutes(originPoint, destPoint);
      if (routed) {
        return {
          travel_minutes: routed.travel_minutes,
          delay_minutes: routed.delay_minutes,
          distance_label: `${originPoint.label} → ${destPoint.label} · ${routed.distance_label}`,
        };
      }
    }

    const estimated = estimateTrafficFromCoordinates(originPoint, destPoint);
    return {
      travel_minutes: estimated.travel_minutes,
      delay_minutes: estimated.delay_minutes,
      distance_label: estimated.distance_label,
    };
  }

  return heuristicFallback(destination, originQuery);
}
