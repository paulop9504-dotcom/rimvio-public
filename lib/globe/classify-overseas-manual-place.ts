import {
  OVERSEAS_PLACE_ENTRIES,
  type OverseasPlaceEntry,
  type OverseasPlaceKind,
} from "@/lib/globe/overseas-place-registry";

export type { OverseasPlaceKind };

export type OverseasManualPlaceHint = {
  isOverseas: true;
  kind: OverseasPlaceKind;
  /** User-facing label — e.g. 상하이 */
  label: string;
  /** Country name for UI — e.g. 중국 */
  countryLabel: string;
  /** Geocode-optimized query */
  geocodeQuery: string;
  lat: number;
  lng: number;
};

const DOMESTIC_GUARD =
  /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|[가-힣]{2,8}동|[가-힣]{2,8}역)/u;

function normalizeHaystack(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function scoreMatch(hay: string, entry: OverseasPlaceEntry): number {
  const match = hay.match(entry.pattern);
  if (!match?.[0]) {
    return 0;
  }
  let score = match[0].trim().length;
  if (entry.kind === "city") {
    score += 100;
  }
  return score;
}

/** True when place text looks like an overseas country or city — not domestic KR. */
export function classifyOverseasManualPlace(
  raw: string,
): OverseasManualPlaceHint | null {
  const hay = normalizeHaystack(raw);
  if (!hay) {
    return null;
  }

  let best: { entry: OverseasPlaceEntry; score: number } | null = null;

  for (const entry of OVERSEAS_PLACE_ENTRIES) {
    const score = scoreMatch(hay, entry);
    if (score <= 0) {
      continue;
    }
    if (
      entry.kind === "country" &&
      DOMESTIC_GUARD.test(hay) &&
      !entry.pattern.test(hay)
    ) {
      continue;
    }
    if (!best || score > best.score) {
      best = { entry, score };
    }
  }

  if (!best) {
    return null;
  }

  const { entry } = best;
  return {
    isOverseas: true,
    kind: entry.kind,
    label: entry.label,
    countryLabel: entry.countryLabel,
    geocodeQuery: entry.geocodeQuery,
    lat: entry.lat,
    lng: entry.lng,
  };
}

export function overseasPlaceConfirmPrompt(hint: OverseasManualPlaceHint): string {
  if (hint.kind === "country") {
    return `${hint.label} — 어느 도시였나요? 후보에서 골라 주세요`;
  }
  return `${hint.label}(${hint.countryLabel}) — 지도에서 맞는 위치를 골라 주세요`;
}
