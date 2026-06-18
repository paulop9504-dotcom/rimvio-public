import type { SearchActivityKind } from "@/lib/location-memory/types";

const LOG_KIND =
  /(?:맛집|카페|역|길찾|가\s*줘|예약|헤어|미용|갤러리아|스타벅스|추천|근처|병원|미팅|회의|일정)/u;

export function shouldLogSearchActivity(message: string): boolean {
  return LOG_KIND.test(message.trim());
}

export function inferSearchActivityKind(message: string): SearchActivityKind {
  const trimmed = message.trim();
  if (/추천|맛집|카페|근처|놀\s*만/u.test(trimmed)) {
    return "discovery";
  }
  if (/길찾|가\s*줘|역|까지|이동/u.test(trimmed)) {
    return "navigation";
  }
  if (/예약|헤어|미용|병원/u.test(trimmed)) {
    return "place_search";
  }
  return "place_search";
}
