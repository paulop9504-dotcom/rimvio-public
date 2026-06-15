import { haversineKm } from "@/lib/geo/haversine-km";
import { fetchNaverLocalPlaceCandidates } from "@/lib/naver/local-to-place-candidate";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import { isKakaoMobilityConfigured, kakaoRestApiKey } from "@/lib/traffic/kakao-mobility-config";

export type GeoPoint = {
  lat: number;
  lng: number;
  label: string;
};

type KakaoLocalDocument = {
  x?: string;
  y?: string;
  place_name?: string;
};

async function kakaoKeywordGeocode(query: string): Promise<GeoPoint | null> {
  const key = kakaoRestApiKey();
  if (!key) {
    return null;
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`,
      {
        headers: { Authorization: `KakaoAK ${key}` },
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as { documents?: KakaoLocalDocument[] };
    const doc = json.documents?.[0];
    if (!doc?.x || !doc?.y) {
      return null;
    }
    const lng = Number(doc.x);
    const lat = Number(doc.y);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng, label: doc.place_name?.trim() || query };
  } catch {
    return null;
  }
}

async function naverKeywordGeocode(query: string): Promise<GeoPoint | null> {
  if (!isNaverSearchConfigured()) {
    return null;
  }
  const candidates = await fetchNaverLocalPlaceCandidates({ query, display: 1 });
  const first = candidates[0];
  if (!first?.lat || !first?.lng) {
    return null;
  }
  return {
    lat: first.lat,
    lng: first.lng,
    label: first.name?.trim() || query,
  };
}

export async function resolvePlaceCoordinates(query: string): Promise<GeoPoint | null> {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  if (isKakaoMobilityConfigured()) {
    const kakao = await kakaoKeywordGeocode(trimmed);
    if (kakao) {
      return kakao;
    }
  }

  return naverKeywordGeocode(trimmed);
}

/** Haversine + urban driving heuristic when directions API unavailable. */
export function estimateTrafficFromCoordinates(
  origin: GeoPoint,
  destination: GeoPoint,
): { travel_minutes: number; delay_minutes: number; distance_label: string } {
  const km = haversineKm(origin, destination);
  const travel_minutes = Math.max(8, Math.round(km * 2.6));
  const delay_minutes = Math.max(0, Math.round(travel_minutes * 0.18));
  return {
    travel_minutes,
    delay_minutes,
    distance_label: `${origin.label} → ${destination.label}`,
  };
}
