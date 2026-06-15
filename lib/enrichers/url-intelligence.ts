import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";
import { cleanPageTitle } from "@/lib/enrichers/clean-page-title";
import { normalizeYouTubeUrl } from "@/lib/enrichers/youtube-url";

const PATH_SKIP = new Set([
  "api",
  "v1",
  "v2",
  "v3",
  "p",
  "m",
  "web",
  "mobile",
  "www",
  "index",
  "page",
  "pages",
  "article",
  "articles",
  "posts",
  "post",
  "products",
  "product",
  "item",
  "items",
  "detail",
  "view",
  "share",
  "redirect",
  "go",
  "link",
  "links",
  "store",
  "shop",
  "eats",
  "global",
  "ko",
  "en",
  "kr",
  "search",
  "entry",
  "place",
  "maps",
  "watch",
  "shorts",
  "live",
  "embed",
  "v",
  "vp",
  "goods",
  "performance",
  "activity",
  "activities",
  "hotel",
  "hotels",
  "flight",
  "flights",
]);

const QUERY_TITLE_KEYS = [
  "title",
  "name",
  "productName",
  "product_name",
  "goodsName",
  "goods_name",
  "menuName",
  "keyword",
  "q",
  "query",
  "search",
  "term",
  "subject",
  "text",
  "place",
  "destination",
  "spot",
  "venue",
  "location",
  "address",
  "word",
  "wd",
  "stx",
  "searchWord",
  "searchword",
];

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).trim();
  } catch {
    return value.replace(/\+/g, " ").trim();
  }
}

function humanizeSlug(value: string) {
  const decoded = decodeSegment(value);
  const cleaned = decoded
    .replace(/\.(html?|php|aspx|jsp)$/i, "")
    .replace(/[-_+.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 2 || cleaned.length > 100) {
    return null;
  }

  if (/^[a-f0-9-]{20,}$/i.test(cleaned)) {
    return null;
  }

  if (/^\d{6,}$/.test(cleaned.replace(/\s/g, ""))) {
    return null;
  }

  return /[a-zA-Z가-힣0-9]/.test(cleaned) ? cleaned : null;
}

function pickBestPathSegment(segments: string[]) {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (!segment) {
      continue;
    }

    const lower = segment.toLowerCase();
    if (PATH_SKIP.has(lower) || /^\d+$/.test(segment)) {
      continue;
    }

    const hint = humanizeSlug(segment);
    if (hint && !isWeakTitleHint(hint)) {
      return hint;
    }
  }

  return null;
}

export function parseQueryTitleHint(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(rawUrl);

    for (const key of QUERY_TITLE_KEYS) {
      const value = parsed.searchParams.get(key);
      if (!value) {
        continue;
      }

      const hint = humanizeSlug(value);
      if (hint && !isWeakTitleHint(hint)) {
        return hint;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function parseMapTitleFromUrl(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (host.includes("naver") && path.includes("/search")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const searchIndex = parts.indexOf("search");

      if (searchIndex >= 0 && parts[searchIndex + 1]) {
        return humanizeSlug(parts[searchIndex + 1]);
      }
    }

    if (host.includes("naver") && path.includes("/entry/place")) {
      const query =
        parsed.searchParams.get("placeName") ??
        parsed.searchParams.get("name") ??
        parsed.searchParams.get("title");

      if (query) {
        return humanizeSlug(query);
      }

      return pickBestPathSegment(parsed.pathname.split("/").filter(Boolean));
    }

    if (host.includes("google") && parsed.pathname.startsWith("/maps")) {
      const query =
        parsed.searchParams.get("q") ??
        parsed.searchParams.get("query") ??
        parsed.searchParams.get("destination");

      if (query) {
        return humanizeSlug(query);
      }

      const placeMatch = parsed.pathname.match(/\/place\/([^/@[?]+)/i);
      if (placeMatch?.[1]) {
        return humanizeSlug(placeMatch[1]);
      }

      const searchMatch = parsed.pathname.match(/\/maps\/search\/([^/]+)/i);
      if (searchMatch?.[1]) {
        return humanizeSlug(searchMatch[1]);
      }
    }

    if (/map\.kakao|kakaomap/i.test(host)) {
      const query =
        parsed.searchParams.get("q") ??
        parsed.searchParams.get("query") ??
        parsed.searchParams.get("name");

      if (query) {
        return humanizeSlug(query);
      }

      const placeMatch = parsed.pathname.match(/\/(?:place|link)\/([^/?]+)/i);
      if (placeMatch?.[1]) {
        return humanizeSlug(placeMatch[1]);
      }

      const searchMatch = parsed.pathname.match(/\/search\/([^/?]+)/i);
      if (searchMatch?.[1]) {
        return humanizeSlug(searchMatch[1]);
      }
    }

    if (/maps\.apple\.com/i.test(host)) {
      const query = parsed.searchParams.get("q") ?? parsed.searchParams.get("address");
      if (query) {
        return humanizeSlug(query);
      }
    }

    if (/map\.daum\.net|dmaps\.daum\.net/i.test(host)) {
      const query =
        parsed.searchParams.get("q") ??
        parsed.searchParams.get("query") ??
        parsed.searchParams.get("name");

      if (query) {
        return humanizeSlug(query);
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function cleanAddressTitle(title: string | null | undefined): string | null {
  if (!title?.trim()) {
    return null;
  }

  const cleaned = title
    .replace(/\s*[-|·]\s*도로명\s*주소\s*$/i, "")
    .replace(/\s*[-|·]\s*도로명주소\s*$/i, "")
    .replace(/\s*[-|·]\s*juso\s*$/i, "")
    .trim();

  return cleaned.length >= 2 ? cleaned : null;
}

export function parseAddressTitleFromUrl(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (/dorojuso\.kr$/i.test(host) && segments.length >= 2) {
      const slug = humanizeSlug(segments[1]);
      if (slug && !isWeakTitleHint(slug)) {
        return slug;
      }
    }

    if (/juso\.go\.kr$/i.test(host)) {
      const slug = pickBestPathSegment(segments);
      if (slug && !isWeakTitleHint(slug)) {
        return slug;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function parseYouTubeTitleFromUrl(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(normalizeYouTubeUrl(rawUrl));
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (!host.includes("youtube") && host !== "youtu.be") {
      return null;
    }

    const queryTitle =
      parsed.searchParams.get("title") ?? parsed.searchParams.get("name");
    if (queryTitle) {
      const hint = humanizeSlug(queryTitle);
      if (hint && !isWeakTitleHint(hint)) {
        return hint;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function parseTitleFromUrl(rawUrl: string): string | null {
  const addressTitle = parseAddressTitleFromUrl(rawUrl);
  if (addressTitle) {
    return addressTitle;
  }

  const mapTitle = parseMapTitleFromUrl(rawUrl);
  if (mapTitle) {
    return mapTitle;
  }

  const queryTitle = parseQueryTitleHint(rawUrl);
  if (queryTitle) {
    return queryTitle;
  }

  const youtubeTitle = parseYouTubeTitleFromUrl(rawUrl);
  if (youtubeTitle) {
    return youtubeTitle;
  }

  try {
    const parsed = normalizeInputUrl(rawUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return pickBestPathSegment(segments);
  } catch {
    return null;
  }
}

/** Best-effort title from URL alone — tries map, query, domain-specific, then path slugs. */
export function parseBestTitleFromUrl(
  rawUrl: string,
  domain?: string
): string | null {
  const normalizedDomain = domain?.trim().toLowerCase().replace(/^www\./, "") ?? "";

  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (/blog\.naver|m\.blog\.naver/i.test(host) && segments[0]) {
      const blogger = humanizeSlug(segments[0]);
      if (blogger && !isWeakTitleHint(blogger)) {
        return `${blogger} 블로그`;
      }
    }

    if (/cafe\.naver|m\.cafe\.naver/i.test(host) && segments[0]) {
      const cafe = humanizeSlug(segments[0]);
      if (cafe && !isWeakTitleHint(cafe)) {
        return cafe;
      }
    }

    if (/news\.naver|n\.news\.naver/i.test(host)) {
      const oid = parsed.searchParams.get("oid");
      const aid = parsed.searchParams.get("aid");
      if (oid && aid) {
        return "네이버 뉴스";
      }
    }

    if (/github\.com/i.test(host) && segments.length >= 2) {
      const repo = decodeSegment(segments[1]);
      if (repo.length >= 2 && /[a-zA-Z0-9]/.test(repo)) {
        return `${repo} · GitHub`;
      }
    }

    if (/smartstore\.naver|shopping\.naver/i.test(host)) {
      const smartstoreHint = pickBestPathSegment(segments);
      if (smartstoreHint) {
        return smartstoreHint;
      }
    }

    if (normalizedDomain.includes("ticket") || /interpark|melon|yes24|ticketlink/i.test(host)) {
      const ticketHint = pickBestPathSegment(segments);
      if (ticketHint) {
        return ticketHint;
      }
    }
  } catch {
    // Fall through to generic parsers.
  }

  return parseTitleFromUrl(rawUrl);
}

const GENERIC_SITE_LABELS =
  /^(쿠팡|무신사|11번가|G마켓|옥션|티몬|SSG|마켓컬리|스마트스토어|네이버 뉴스).*(상품|티켓|뉴스)?$/;

function isGenericSiteLabel(value: string) {
  return GENERIC_SITE_LABELS.test(value.trim());
}

/** Pick the strongest display title from scraped metadata vs URL heuristics. */
export function resolveBestTitle(input: {
  metadataTitle?: string | null;
  rawUrl: string;
  domain?: string;
  siteName?: string | null;
}): string | null {
  const metaRaw = input.metadataTitle?.trim() || null;
  const meta = metaRaw ? cleanPageTitle(metaRaw, input.siteName) ?? metaRaw : null;
  const urlHint = parseBestTitleFromUrl(input.rawUrl, input.domain);

  const metaOk = meta && !isWeakTitleHint(meta) && !isGarbledText(meta);
  const urlOk = urlHint && !isWeakTitleHint(urlHint);

  if (metaOk && urlOk) {
    if (isGenericSiteLabel(meta) && !isGenericSiteLabel(urlHint)) {
      return urlHint;
    }

    if (meta.length >= 8 || !urlOk) {
      return meta;
    }

    if (urlHint.length > meta.length + 4) {
      return urlHint;
    }

    return meta;
  }

  if (metaOk) {
    return meta;
  }

  if (urlOk) {
    return urlHint;
  }

  return meta ?? urlHint;
}

export function parseYouTubeStartSeconds(rawUrl: string): number | null {
  try {
    const parsed = normalizeInputUrl(normalizeYouTubeUrl(rawUrl));
    const raw =
      parsed.searchParams.get("t") ?? parsed.searchParams.get("start") ?? null;

    if (!raw) {
      return null;
    }

    if (/^\d+$/.test(raw)) {
      return Number(raw);
    }

    if (/\d+[hms]/i.test(raw)) {
      let total = 0;

      for (const match of raw.matchAll(/(\d+)([hms])/gi)) {
        const amount = Number(match[1]);
        const unit = match[2].toLowerCase();

        if (unit === "h") {
          total += amount * 3600;
        } else if (unit === "m") {
          total += amount * 60;
        } else {
          total += amount;
        }
      }

      return total > 0 ? total : null;
    }

    const match = raw.match(/^(\d+)([hms])?$/i);
    if (!match) {
      return null;
    }

    const amount = Number(match[1]);
    const unit = (match[2] ?? "s").toLowerCase();

    if (unit === "h") {
      return amount * 3600;
    }

    if (unit === "m") {
      return amount * 60;
    }

    return amount;
  } catch {
    return null;
  }
}

export function formatYouTubeTimestamp(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

const COMMERCE_HOST_SUFFIXES = [
  "yo-go.co.kr",
  "coupang.com",
  "11st.co.kr",
  "musinsa.com",
  "gmarket.co.kr",
  "amazon.co.kr",
  "amazon.com",
  "ssg.com",
  "lotte.com",
  "smartstore.naver.com",
  "shopping.naver.com",
  "shopify.com",
  "wconcept.co.kr",
  "ably.co.kr",
  "29cm.co.kr",
  "brandi.co.kr",
  "hmall.com",
  "kurly.com",
  "marketkurly.com",
  "auction.co.kr",
  "interpark.com",
  "tmon.co.kr",
  "zigzag.kr",
  "cjonstyle.com",
  "gsshop.com",
  "homeplus.co.kr",
  "emart.ssg.com",
  "oliveyoung.co.kr",
  "idus.com",
  "trenbe.com",
  "queenit.kr",
  "joongna.com",
  "web.joongna.com",
  "bunjang.co.kr",
  "m.bunjang.co.kr",
  "daangn.com",
  "karrotmarket.com",
];

export function isCommerceDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");

  return COMMERCE_HOST_SUFFIXES.some((suffix) => {
    const bare = suffix.replace(/^www\./, "");
    return normalized === bare || normalized.endsWith(`.${bare}`);
  });
}

export function commercePrimaryLabel(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");

  if (normalized.includes("yo-go")) {
    return "🛒 타임딜 열기";
  }
  if (normalized.includes("coupang")) {
    return "🛒 쿠팡에서 보기";
  }
  if (normalized.includes("11st")) {
    return "🛒 11번가에서 보기";
  }
  if (normalized.includes("musinsa")) {
    return "🛒 무신사에서 보기";
  }
  if (normalized.includes("kurly") || normalized.includes("marketkurly")) {
    return "🛒 마켓컬리에서 보기";
  }
  if (normalized.includes("oliveyoung")) {
    return "🛒 올리브영에서 보기";
  }
  if (normalized.includes("smartstore") || normalized.includes("shopping.naver")) {
    return "🛒 스마트스토어 보기";
  }
  if (normalized.includes("gmarket")) {
    return "🛒 G마켓에서 보기";
  }
  if (normalized.includes("auction")) {
    return "🛒 옥션에서 보기";
  }
  if (normalized.includes("joongna") || normalized.includes("junggo")) {
    return "🛒 중고나라에서 보기";
  }
  if (normalized.includes("bunjang")) {
    return "🛒 번개장터에서 보기";
  }
  if (normalized.includes("daangn") || normalized.includes("karrot")) {
    return "🛒 당근에서 보기";
  }

  return "🛒 상품 보기";
}

export function isWeakTitleHint(hint: string | null | undefined) {
  if (!hint?.trim()) {
    return true;
  }

  const trimmed = hint.trim();

  if (isGarbledText(trimmed)) {
    return true;
  }

  if (/^\d+$/.test(trimmed)) {
    return true;
  }

  if (trimmed.length < 2) {
    return true;
  }

  if (/^(home|index|main|default|untitled|document)$/i.test(trimmed)) {
    return true;
  }

  return false;
}

/** Mojibake / wrong charset — reject for display and copy text. */
export function isGarbledText(text: string | null | undefined) {
  if (!text?.trim()) {
    return false;
  }

  const trimmed = text.trim();

  if (trimmed.includes("\uFFFD")) {
    return true;
  }

  if (/ï¿½|Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]/.test(trimmed)) {
    return true;
  }

  const hangul = (trimmed.match(/[가-힣]/g) ?? []).length;
  const latinExtended = (trimmed.match(/[\u00C0-\u024F]/g) ?? []).length;
  const brokenPairs = (trimmed.match(/[\u0080-\u00FF]{2,}/g) ?? []).length;

  if (latinExtended >= 2 && hangul === 0 && brokenPairs > 0) {
    return true;
  }

  if (
    latinExtended >= 2 &&
    hangul === 0 &&
    trimmed.length <= 32 &&
    !/[a-zA-Z]{4,}/.test(trimmed)
  ) {
    return true;
  }

  if (/^[\u0000-\u007F\u00A0-\u00FF\s]+$/.test(trimmed) && latinExtended >= 3 && hangul === 0) {
    const wordChars = trimmed.replace(/\s+/g, "");
    if (wordChars.length >= 4 && wordChars.length <= 24) {
      return true;
    }
  }

  const hasReadableHangul = /[가-힣]{2,}/.test(trimmed);
  const hasReadableLatin = /[a-zA-Z]{3,}/.test(trimmed);

  if (!hasReadableHangul && !hasReadableLatin && trimmed.length >= 2) {
    return true;
  }

  if (
    hangul > 0 &&
    hangul < trimmed.length * 0.35 &&
    latinExtended + brokenPairs > 0
  ) {
    return true;
  }

  return false;
}

/** Commerce title when og/meta is missing or numeric slug only. */
export function parseCommerceHintFromUrl(
  rawUrl: string,
  domain: string
): string | null {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");

  try {
    const parsed = normalizeInputUrl(rawUrl);
    const path = parsed.pathname;
    const segments = path.split("/").filter(Boolean);

    const slugHint = parseBestTitleFromUrl(rawUrl, domain);
    if (slugHint && !isWeakTitleHint(slugHint) && !isGenericSiteLabel(slugHint)) {
      return slugHint;
    }

    if (normalized.includes("coupang") && !/\/eats\b/i.test(path)) {
      if (/\/products?\/\d+$/i.test(path) || /\/vp\/\d+$/i.test(path)) {
        return "쿠팡 상품";
      }
    }

    if (normalized.includes("musinsa") && /\/products\/\d+$/i.test(path)) {
      return "무신사 상품";
    }

    if (normalized.includes("11st") && /\/products?\/\d+$/i.test(path)) {
      return "11번가 상품";
    }

    if (normalized.includes("smartstore") || normalized.includes("shopping.naver")) {
      const storeName = segments.find(
        (segment) => segment && !/^\d+$/.test(segment) && !PATH_SKIP.has(segment.toLowerCase())
      );
      const storeHint = storeName ? humanizeSlug(storeName) : null;
      if (storeHint && !isWeakTitleHint(storeHint)) {
        return storeHint;
      }
      return "스마트스토어 상품";
    }

    if (normalized.includes("gmarket")) {
      return slugHint ?? "G마켓 상품";
    }

    if (normalized.includes("kurly") || normalized.includes("marketkurly")) {
      return slugHint ?? "마켓컬리 상품";
    }

    if (normalized.includes("coupang")) {
      return "쿠팡 상품";
    }
    if (normalized.includes("musinsa")) {
      return "무신사 상품";
    }
    if (normalized.includes("11st")) {
      return "11번가 상품";
    }
  } catch {
    return null;
  }

  return null;
}
