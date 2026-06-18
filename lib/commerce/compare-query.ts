import {
  isSecondhandDomain,
  looksLikeSecondhandTitle,
  normalizeSecondhandTitle,
} from "@/lib/commerce/commerce-cleaner";

/** Build a search query for price/compare deep links from a listing title. */
export function buildCompareQuery(
  title: string | null | undefined,
  domain?: string | null
): string | null {
  const raw = title?.trim();
  if (!raw) {
    return null;
  }

  if (isSecondhandDomain(domain) || looksLikeSecondhandTitle(raw)) {
    const normalized = normalizeSecondhandTitle(raw);
    return normalized.length >= 2 ? normalized : raw;
  }

  return raw;
}
