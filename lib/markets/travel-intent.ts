import type { LinkRow } from "@/types/database";

const TRAVEL_INTENT_PATTERN =
  /여행|관광|일정|호텔|항공|맛집|카페|숙소|예약|일몰|일출|sunset|sunrise|beach|beaches|landmark|itinerary|flight|hotel|airbnb|booking|리조트|온천|스키|캠핑|해변|섬\b|성\b|봉\b|지도|길찾|oia|santorini|paris|tokyo|kyoto|bali|maldives|alps|safari|times square|eiffel|tower|temple|wat arun|great wall|경복궁|제주|부산|광안|성산/i;

/** Place / travel queries must never become Amazon or Naver Shopping searches. */
export function looksLikeTravelIntent(input: {
  title?: string | null;
  domain?: string | null;
  sourceUrl?: string | null;
  category?: LinkRow["category"] | null;
  source_type?: LinkRow["source_type"] | null;
}) {
  if (input.category === "travel") {
    return true;
  }

  if (input.source_type === "map" || input.source_type === "transport") {
    return true;
  }

  const haystack = `${input.title ?? ""} ${input.domain ?? ""} ${input.sourceUrl ?? ""}`;
  if (TRAVEL_INTENT_PATTERN.test(haystack)) {
    return true;
  }

  if (
    input.source_type === "screenshot" &&
    /rimvio\.app\/capture|\/capture\//i.test(input.sourceUrl ?? "")
  ) {
    return TRAVEL_INTENT_PATTERN.test(input.title ?? "");
  }

  return false;
}

export function shouldOfferMarketCompare(input: {
  title?: string | null;
  domain?: string | null;
  sourceUrl?: string | null;
  category?: LinkRow["category"] | null;
  source_type?: LinkRow["source_type"] | null;
}) {
  return !looksLikeTravelIntent(input);
}
