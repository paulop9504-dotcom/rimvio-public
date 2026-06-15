import { encodeQuery } from "@/lib/actions/search-urls";

export {
  buildDanawaSearchHref,
  buildBunjangSearchHref,
  buildJoongnaSearchHref,
  buildNaverShoppingSearchHref,
} from "@/lib/actions/search-urls";

export function buildDaangnSearchHref(query: string) {
  return `https://www.daangn.com/search/${encodeQuery(query)}`;
}

export function buildMusinsaSearchHref(query: string) {
  return `https://www.musinsa.com/search/musinsa?q=${encodeQuery(query)}`;
}

export function buildEbaySearchHref(query: string) {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeQuery(query)}`;
}

export function buildAmazonSearchHref(query: string, host = "www.amazon.com") {
  return `https://${host}/s?k=${encodeQuery(query)}`;
}

export function buildFacebookMarketplaceSearchHref(query: string) {
  return `https://www.facebook.com/marketplace/search/?query=${encodeQuery(query)}`;
}

export function buildGoogleShoppingSearchHref(query: string) {
  return `https://www.google.com/search?tbm=shop&q=${encodeQuery(query)}`;
}

export function buildBestBuySearchHref(query: string) {
  return `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeQuery(query)}`;
}

export function buildMercariSearchHref(query: string) {
  return `https://jp.mercari.com/search?keyword=${encodeQuery(query)}`;
}

export function buildRakumaSearchHref(query: string) {
  return `https://fril.jp/s?query=${encodeQuery(query)}`;
}

export function buildKakakuSearchHref(query: string) {
  return `https://search.kakaku.com/search_results/${encodeQuery(query)}/`;
}

export function buildYahooAuctionJpSearchHref(query: string) {
  return `https://auctions.yahoo.co.jp/search/search?p=${encodeQuery(query)}`;
}

export function buildPoshmarkSearchHref(query: string) {
  return `https://poshmark.com/search?query=${encodeQuery(query)}`;
}

export function buildDepopSearchHref(query: string) {
  return `https://www.depop.com/search/?q=${encodeQuery(query)}`;
}
