import { isSecondhandDomain } from "@/lib/commerce/commerce-cleaner";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";

function hostnameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Share intents and paste blobs can carry a stale product title from the
 * previous page while the URL already points at a different listing.
 * For commerce / secondhand URLs we only trust server-side scrape titles.
 */
export function shouldTrustClientTitle(url: string, title: string | null | undefined) {
  if (!title?.trim()) {
    return true;
  }

  const host = hostnameFromUrl(url);
  if (!host) {
    return true;
  }

  if (isCommerceDomain(host) || isSecondhandDomain(host)) {
    return false;
  }

  return true;
}

export function resolveClientLinkTitle(
  url: string,
  title: string | null | undefined,
  fallback: string
) {
  if (title?.trim() && shouldTrustClientTitle(url, title)) {
    return title.trim();
  }

  return fallback;
}
