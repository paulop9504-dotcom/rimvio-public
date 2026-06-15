import { buildNaverMapSearchWebHref } from "@/lib/resolvers/deep-links";

export function buildBaeminPlaceSearchHref(placeName: string) {
  const query = placeName.trim();
  const web = `https://www.baemin.com/search?keyword=${encodeURIComponent(query)}`;
  return {
    href: `baemin://webview?webview_url=${encodeURIComponent(web)}`,
    fallbackHref: web,
  };
}

export function buildNaverPlaceReviewHref(placeName: string) {
  return buildNaverMapSearchWebHref(`${placeName.trim()} 리뷰`);
}
