import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";

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
    .replace(/\.(html?|php|aspx)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 2 || cleaned.length > 80) {
    return null;
  }

  if (/^\d+$/.test(cleaned)) {
    return null;
  }

  if (/^[a-f0-9-]{20,}$/i.test(cleaned)) {
    return null;
  }

  return /[a-zA-Z가-힣]/.test(cleaned) ? cleaned : null;
}

const SHOP_PATH_MARKERS = new Set([
  "shop",
  "store",
  "restaurant",
  "restaurants",
  "menu",
  "merchants",
  "food",
  "brand",
  "franchise",
  "listing",
]);

/** Site-wide titles that are not a restaurant name. */
export function isGenericDeliverySiteTitle(title: string | null | undefined) {
  if (!title?.trim()) {
    return true;
  }

  const normalized = title.trim();

  if (
    /^(배달의민족|배민|요기요|쿠팡이츠|coupang eats)/i.test(normalized)
  ) {
    return true;
  }

  if (/배민클럽|배달팁|배달앱|food delivery/i.test(normalized)) {
    return true;
  }

  return normalized.length > 48 && /배달|주문|앱/i.test(normalized);
}

export function parseDeliveryShopFromUrl(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);

    for (let index = 0; index < segments.length - 1; index += 1) {
      const marker = segments[index]?.toLowerCase();
      if (!marker || !SHOP_PATH_MARKERS.has(marker)) {
        continue;
      }

      const idSegment = segments[index + 1];
      const nameSegment = segments[index + 2];

      if (nameSegment) {
        const name = humanizeSlug(nameSegment);
        if (name) {
          return name;
        }
      }

      if (idSegment && !/^\d+$/.test(idSegment)) {
        const slugName = humanizeSlug(idSegment);
        if (slugName) {
          return slugName;
        }
      }
    }

    for (const key of [
      "shopName",
      "restaurantName",
      "storeName",
      "name",
      "q",
      "keyword",
      "brandName",
      "menuName",
    ]) {
      const queryValue = parsed.searchParams.get(key);
      if (queryValue) {
        const name = humanizeSlug(queryValue);
        if (name) {
          return name;
        }
      }
    }

    if (/baemin|yogiyo|coupang\.com\/eats/i.test(parsed.hostname + parsed.pathname)) {
      const brandMatch = parsed.pathname.match(/\/brand[-_]?(\d+[-_][^/]+)/i);
      if (brandMatch?.[1]) {
        const brandHint = humanizeSlug(brandMatch[1]);
        if (brandHint) {
          return brandHint;
        }
      }
    }

    const last = segments[segments.length - 1];
    if (last) {
      const lower = last.toLowerCase();
      if (!SHOP_PATH_MARKERS.has(lower) && lower !== "eats") {
        return humanizeSlug(last);
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveDeliveryShopTitle(
  rawUrl: string,
  metadataTitle: string | null | undefined
): string | null {
  const fromUrl = parseDeliveryShopFromUrl(rawUrl);
  if (fromUrl) {
    return fromUrl;
  }

  const trimmed = metadataTitle?.trim();
  if (trimmed && !isGenericDeliverySiteTitle(trimmed)) {
    return trimmed;
  }

  return null;
}
