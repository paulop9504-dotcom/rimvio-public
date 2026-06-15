/** Tracking / attribution query params stripped before scrape & routing. */
const TRACKING_PARAM_EXACT = new Set([
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "mkt_tok",
  "igshid",
  "igsh",
  "si",
  "spm",
  "scm",
  "aff_id",
  "affid",
  "ref",
  "ref_src",
  "ref_url",
  "referrer",
  "source",
  "campaign",
  "cmpid",
  "ncid",
  "srsltid",
  "ved",
  "ei",
  "_ga",
  "_gl",
  "yclid",
  "wbraid",
  "gbraid",
]);

function isTrackingParam(key: string) {
  const lower = key.toLowerCase();
  return (
    lower.startsWith("utm_") ||
    lower.startsWith("mtm_") ||
    lower.startsWith("pk_") ||
    TRACKING_PARAM_EXACT.has(lower)
  );
}

function normalizeInputUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("url_required");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return new URL(withProtocol);
}

/**
 * Remove marketing/tracking query params from a URL.
 * Preserves functional params (e.g. product ids, search queries).
 */
export function cleanUrl(raw: string): string {
  const parsed = normalizeInputUrl(raw);

  for (const key of [...parsed.searchParams.keys()]) {
    if (isTrackingParam(key)) {
      parsed.searchParams.delete(key);
    }
  }

  parsed.hash = "";

  const href = parsed.href;
  if (parsed.pathname !== "/" && href.endsWith("/")) {
    return href.slice(0, -1);
  }

  return href;
}

export function cleanUrlSafe(raw: string): string | null {
  try {
    return cleanUrl(raw);
  } catch {
    return null;
  }
}
