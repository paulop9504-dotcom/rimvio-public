import type { PlaceCandidate } from "@/lib/context-resolver/places/types";

const MEMORY_HAYSTACK =
  /뷰|전망|노을|일몰|바다|해변|감성|분위기|데이트|루프탑|terrace|ocean|view|카페/u;

function memoryScore(place: PlaceCandidate): number {
  const hay = [place.name, place.naver_category, place.description, place.reason]
    .filter(Boolean)
    .join(" ");

  let score = 0;
  if (MEMORY_HAYSTACK.test(hay)) {
    score += 10;
  }
  if (/카페|디저트|베이커리|아이스크림/u.test(hay)) {
    score += 4;
  }
  if (/편의점|마트|할인/u.test(hay)) {
    score -= 8;
  }
  return score;
}

/** Re-rank for MEMORY mode — atmosphere over convenience. */
export function rankPlaceCandidatesByMemory(
  candidates: PlaceCandidate[]
): PlaceCandidate[] {
  if (candidates.length <= 1) {
    return candidates;
  }

  return [...candidates]
    .map((place) => ({ place, score: memoryScore(place) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.place);
}

export function memoryHighlightForPlace(place: PlaceCandidate): string | null {
  const hay = [place.name, place.naver_category, place.description].filter(Boolean).join(" ");
  if (/노을|일몰|sunset/u.test(hay)) {
    return "거리는 조금 멀어도, 지금 노을이 예쁜 곳이에요.";
  }
  if (/뷰|전망|바다|해변/u.test(hay)) {
    return "분위기·뷰가 좋아 추억 남기기 좋아요.";
  }
  if (/카페|디저트/u.test(hay)) {
    return "대화하기 좋은 분위기예요.";
  }
  return null;
}
