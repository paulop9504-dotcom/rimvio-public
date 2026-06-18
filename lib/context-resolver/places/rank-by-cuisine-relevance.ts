import type { PlaceCandidate } from "@/lib/context-resolver/places/types";

const CHAIN_FAST_FOOD =
  /맥도날드|롯데리아|버거킹|kfc|맘스터치|서브웨이|파리바게|파리크라상|던킨|이디야|스타벅스|할리스|컴포즈|빽다방/i;

const GENERIC_BAKERY_CAFE =
  /베이커리|제과|카페,|>카페>|>제과>|>베이커리>/i;

const CUISINE_MATCHERS: Record<string, RegExp> = {
  스테이크: /steak|스테이크|등심|안심|티본|육회|그릴|그릴드/i,
  steak: /steak|스테이크|등심|안심|티본|육회|그릴|그릴드/i,
  파스타: /pasta|파스타|이탈리/i,
  pizza: /pizza|피자/i,
  피자: /pizza|피자/i,
  초밥: /초밥|스시|sushi|오마카세/i,
  스시: /초밥|스시|sushi|오마카세/i,
  sushi: /초밥|스시|sushi|오마카세/i,
  삼겹살: /삼겹|돼지|고기|bbq|바베큐/i,
  갈비: /갈비|고깃|숯불/i,
  돈까스: /돈까스|카츠|katsu/i,
  라멘: /라멘|ramen/i,
  우동: /우동|udon/i,
  칼국수: /칼국수|국수/i,
  국밥: /국밥|곰탕|설렁탕/i,
  떡볶이: /떡볶|분식/i,
  회: /회|횟집|사시미|sashimi/i,
  해산물: /해산|회|조개|게|새우/i,
  치킨: /치킨|chicken|통닭|후라이드/i,
  족발: /족발|보쌈|막국수/i,
  보쌈: /보쌈|족발/i,
  냉면: /냉면|메밀/i,
  브런치: /브런치|brunch/i,
  중식: /중식|중국|짜장|짬뽕|마라/i,
  일식: /일식|이자카야|라멘|우동|돈까스|스시/i,
  한식: /한식|백반|국밥|찌개|비빔/i,
  양식: /양식|western|이탈|프렌치|스테이크/i,
  술집: /술집|주점|포차|바>/i,
  포차: /포차|주점|술집/i,
  만두: /만두|교자/i,
};

function placeHaystack(place: PlaceCandidate): string {
  return [place.name, place.naver_category, place.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const CUISINE_MISMATCH: Record<string, RegExp> = {
  치킨: />이탈리|>베트남|>태국|>멕시코|>인도|>중국>|>일식>|>양식>|>카페>|>디저트|>베이커리|>제과>|>커피/i,
  pizza: />한식>|>중식>|>일식>|>치킨>|>카페>/i,
  피자: />한식>|>중식>|>일식>|>치킨>|>카페>/i,
  초밥: />치킨>|>피자>|>양식>|>카페>|>디저트/i,
  스시: />치킨>|>피자>|>양식>|>카페>|>디저트/i,
  sushi: />치킨>|>피자>|>양식>|>카페>|>디저트/i,
};

const STRICT_CUISINE_FILTER = new Set(["치킨", "피자", "pizza", "초밥", "스시", "sushi"]);

function scorePlace(place: PlaceCandidate, cuisine: string): number {
  const haystack = placeHaystack(place);
  const cuisineLower = cuisine.toLowerCase();
  let score = 0;

  if (haystack.includes(cuisineLower)) {
    score += 12;
  }

  const matcher = CUISINE_MATCHERS[cuisine] ?? CUISINE_MATCHERS[cuisineLower];
  if (matcher?.test(haystack)) {
    score += 8;
  }

  const mismatch = CUISINE_MISMATCH[cuisine] ?? CUISINE_MISMATCH[cuisineLower];
  if (mismatch?.test(haystack) && score < 8) {
    score -= 30;
  }

  if (CHAIN_FAST_FOOD.test(place.name)) {
    score -= 20;
  }

  if (/햄버거|burger|버거>/i.test(haystack) && /스테이크|steak/i.test(cuisine)) {
    score -= 15;
  }

  if (GENERIC_BAKERY_CAFE.test(haystack) && !/브런치|베이커리|빵|디저트/i.test(cuisine)) {
    score -= 10;
  }

  if (/>분식>|>패스트푸드>/i.test(haystack) && !/떡볶이|분식/i.test(cuisine)) {
    score -= 8;
  }

  return score;
}

/** Re-rank Naver local hits; drop obvious mismatches when a cuisine was requested. */
export function rankPlaceCandidatesByCuisine(
  candidates: PlaceCandidate[],
  cuisine: string | null
): PlaceCandidate[] {
  if (!cuisine || candidates.length === 0) {
    return candidates;
  }

  const cuisineLower = cuisine.toLowerCase();
  const strictFilter =
    STRICT_CUISINE_FILTER.has(cuisine) || STRICT_CUISINE_FILTER.has(cuisineLower);

  const scored = candidates
    .map((place) => ({ place, score: scorePlace(place, cuisine) }))
    .sort((a, b) => b.score - a.score);

  const minScore = strictFilter ? 1 : -8;
  let kept = scored.filter((entry) => entry.score > minScore);

  if (kept.length === 0 && !strictFilter) {
    kept = scored.filter((entry) => entry.score > -8);
  }

  if (kept.length > 0) {
    return kept.map((entry) => entry.place);
  }

  const nameMatch = candidates.filter((place) =>
    placeHaystack(place).includes(cuisineLower)
  );
  if (nameMatch.length > 0) {
    return nameMatch;
  }

  return strictFilter ? [] : candidates;
}
