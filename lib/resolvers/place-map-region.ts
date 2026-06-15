/** Korea bounding box — domestic map apps (Kakao/Naver) are useful here. */
const KOREA_BOUNDS = {
  minLat: 33.0,
  maxLat: 38.85,
  minLng: 124.4,
  maxLng: 132.2,
} as const;

const DOMESTIC_PLACE_HINT =
  /서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|전라|경상|제주|강남|홍대|명동|이태원|한국|대한민국|\bkorea\b|\bseoul\b|\bbusan\b|\bjeju\b|\bincheon\b|\bgyeonggi\b|\bdaegu\b|\bdajeon\b|\bgwangju\b/i;

const OVERSEAS_PLACE_HINT =
  /\beiffel\b|\btower\b|\bparis\b|\blondon\b|big ben|times square|santorini|zermatt|iceland|sagrada|waikiki|amalfi|kiyomizu|mutianyu|\brome\b|\bbarcelona\b|new york|manhattan|statue of liberty|colosseum|louvre|versailles|\bbali\b|maldives|tokyo tower|shibuya|osaka castle|mount fuji|\bfuji\b|golden gate|grand canyon|blue lagoon|notre.?dame|buckingham|empire state|burj khalifa|machu picchu|angkor wat|petra\b|taj mahal|sydney opera|harbour bridge/i;

export function parseGoogleMapCoords(
  rawUrl: string
): { lat: number; lng: number } | null {
  const atMatch = rawUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  try {
    const parsed = new URL(rawUrl);
    const center =
      parsed.searchParams.get("center") ?? parsed.searchParams.get("ll");
    if (center) {
      const [latRaw, lngRaw] = center.split(",");
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export function isCoordInKorea(lat: number, lng: number): boolean {
  return (
    lat >= KOREA_BOUNDS.minLat &&
    lat <= KOREA_BOUNDS.maxLat &&
    lng >= KOREA_BOUNDS.minLng &&
    lng <= KOREA_BOUNDS.maxLng
  );
}

export function isDomesticMapPlace(input: {
  sourceUrl: string;
  title?: string | null;
  placeName?: string | null;
}): boolean {
  const coords = parseGoogleMapCoords(input.sourceUrl);
  if (coords) {
    return isCoordInKorea(coords.lat, coords.lng);
  }

  if (/map\.naver|map\.kakao|naver\.me\/.*place|dorojuso|juso\.go\.kr/i.test(input.sourceUrl)) {
    return true;
  }

  const haystack = `${input.title ?? ""} ${input.placeName ?? ""}`.trim();
  if (!haystack) {
    return true;
  }

  if (DOMESTIC_PLACE_HINT.test(haystack)) {
    return true;
  }

  if (OVERSEAS_PLACE_HINT.test(haystack)) {
    return false;
  }

  if (/[가-힣]/.test(haystack)) {
    return true;
  }

  if (/google\.com\/maps|maps\.google/i.test(input.sourceUrl)) {
    return false;
  }

  return true;
}

export function isDomesticMapAction(action: {
  label: string;
  href?: string | null;
  payload?: { icon?: string | null } | null;
}): boolean {
  const target = `${action.label} ${action.href ?? ""} ${action.payload?.icon ?? ""}`;
  return /kakaomap|map\.kakao|nmap:|map\.naver|네이버지도|카카오맵|카카오T|카카오 T/i.test(
    target
  );
}
