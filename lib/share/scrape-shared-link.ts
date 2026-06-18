import type { EnrichedLink, EnricherContext } from "@/lib/enrichers/types";

export function sharedLinkExpiresAt(days = 7) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function enrichSharedUrl(
  url: string,
  context?: EnricherContext
): Promise<EnrichedLink> {
  const response = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      persist: false,
      context,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not enrich this link.");
  }

  return response.json() as Promise<EnrichedLink>;
}

/** @deprecated Use enrichSharedUrl */
export async function scrapeSharedUrl(
  url: string,
  context?: EnricherContext
): Promise<EnrichedLink> {
  return enrichSharedUrl(url, context);
}
