import type { PlaceCandidate } from "@/lib/context-resolver/places/types";

/** Naver local category paths that are not sit-down dining. */
const NON_RESTAURANT_CATEGORY =
  />카페>|>디저트>|>베이커리>|>제과>|>커피|>tea>|>아이스크림>|>도넛>|>차,|카페,디저트|>테마카페>|>커피전문점>/iu;

const RESTAURANT_CATEGORY =
  />한식>|>중식>|>일식>|>양식>|>분식>|>치킨>|>고기|>술집>|>주점>|>패스트푸드>|>아시아>|>뷔페>|>해산물>|>국수>|>면>|>죽>|>도시락>/iu;

const NON_RESTAURANT_NAME =
  /성심당|파리바게|파리크라상|던킨|스타벅스|이디야|할리스|컴포즈|뚜레쥬르|베즐리|투썸|메가커피|빽다방|공차|설빙|베스킨|요거트|타르트\s*하우스|디저트\s*(?:카페|전문)/iu;

const DESSERT_CAFE_INTENT =
  /카페|coffee|디저트|빵|베이커리|제과|성심당|브런치|케이크|티하우스|tea\s*house|아이스크림|도넛|마카롱/iu;

export function userWantsCafeOrDessert(message: string): boolean {
  return DESSERT_CAFE_INTENT.test(message.trim());
}

function placeHaystack(place: PlaceCandidate): string {
  return [place.naver_category, place.name, place.description]
    .filter(Boolean)
    .join(" ");
}

/** True when Naver hit is cafe / bakery / dessert — not a meal restaurant. */
export function isNonRestaurantCandidate(place: PlaceCandidate): boolean {
  const haystack = placeHaystack(place);

  if (RESTAURANT_CATEGORY.test(haystack)) {
    return false;
  }

  if (NON_RESTAURANT_CATEGORY.test(haystack)) {
    return true;
  }

  if (NON_RESTAURANT_NAME.test(place.name)) {
    return true;
  }

  if (/카페|베이커리|제과|디저트|빵집|커피/i.test(place.name) && !/>한식>|>중식>|>일식>|>양식>/i.test(haystack)) {
    return true;
  }

  return false;
}

/**
 * Drop cafe / dessert / bakery hits when the user asked for dining (맛집, 식당, cuisine).
 * Falls back to original list only when every hit would be removed.
 */
export function filterRestaurantCandidates(
  candidates: PlaceCandidate[],
  userMessage: string
): PlaceCandidate[] {
  if (candidates.length === 0 || userWantsCafeOrDessert(userMessage)) {
    return candidates;
  }

  const filtered = candidates.filter((place) => !isNonRestaurantCandidate(place));
  return filtered.length > 0 ? filtered : candidates;
}

/** Generic dining search label — avoids Naver "맛집" hot-place noise. */
export function diningSearchLabel(message: string): string {
  if (/가성비|저렴|싸게|싼/u.test(message)) {
    return "가성비 맛집";
  }
  if (/가볍|샐러드|샌드|브런치/u.test(message)) {
    return "브런치";
  }
  if (/술집|포차|주점|bar/i.test(message)) {
    return "술집";
  }
  if (/식당|음식점|레스토랑|밥\s*집/i.test(message)) {
    return "음식점";
  }
  return "맛집";
}
