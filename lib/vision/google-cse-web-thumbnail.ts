export function isGoogleCseConfigured() {
  return Boolean(
    process.env.GOOGLE_CSE_API_KEY?.trim() && process.env.GOOGLE_CSE_ID?.trim()
  );
}

type GoogleCseWebItem = {
  link?: string;
  pagemap?: {
    cse_image?: Array<{ src?: string }>;
    cse_thumbnail?: Array<{ src?: string }>;
    metatags?: Array<{ "og:image"?: string }>;
  };
};

/** Google Custom Search — pagemap.cse_image thumbnail from web results. */
export async function fetchGoogleCseWebThumbnail(query: string): Promise<string | null> {
  const apiKey =
    process.env.GOOGLE_CSE_API_KEY?.trim() ??
    process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_ID?.trim();

  if (!apiKey || !cx || !query.trim()) {
    return null;
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query.trim(),
    num: "1",
    safe: "active",
  });

  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
      { cache: "no-store", signal: AbortSignal.timeout(6_000) }
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { items?: GoogleCseWebItem[] };
    const item = payload.items?.[0];
    if (!item) {
      return null;
    }

    return (
      item.pagemap?.cse_image?.[0]?.src?.trim() ??
      item.pagemap?.cse_thumbnail?.[0]?.src?.trim() ??
      item.pagemap?.metatags?.[0]?.["og:image"]?.trim() ??
      null
    );
  } catch {
    return null;
  }
}
