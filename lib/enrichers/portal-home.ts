import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";

const PORTAL_HOST_KEYS: Record<string, string> = {
  "google.com": "google",
  "naver.com": "naver",
  "youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "coupang.com": "coupang",
  "amazon.com": "amazon",
  "amazon.co.kr": "amazon",
};

export function normalizePortalHost(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

/** Lazy link — site home, not a deep content URL. */
export function isPortalHomeUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = normalizePortalHost(parsed.hostname);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";

    if (path !== "/") {
      return false;
    }

    return Boolean(PORTAL_HOST_KEYS[host]);
  } catch {
    return false;
  }
}

export function resolvePortalSuiteKey(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = normalizePortalHost(parsed.hostname);
    return PORTAL_HOST_KEYS[host] ?? null;
  } catch {
    return null;
  }
}
