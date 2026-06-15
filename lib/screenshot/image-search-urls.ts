import { encodeQuery } from "@/lib/actions/search-urls";

export function buildNaverImageSearchHref(query: string) {
  return `https://search.naver.com/search.naver?where=image&query=${encodeQuery(query)}`;
}

export function buildGoogleImageSearchHref(query: string) {
  return `https://www.google.com/search?tbm=isch&q=${encodeQuery(query)}`;
}

export function buildGoogleLensHref(query: string) {
  return `https://lens.google.com/search?p=${encodeQuery(query)}`;
}

export function buildMusinsaImageStyleHref(query: string) {
  return `https://www.musinsa.com/search/musinsa?q=${encodeQuery(query)}`;
}
