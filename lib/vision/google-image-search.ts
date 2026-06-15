const FASHION_QUERY_SUFFIX = " clothing fashion";

export type ImageSearchHit = {
  url: string;
  title: string;
  thumbnail?: string;
};

export function isGoogleCseConfigured() {
  return Boolean(
    process.env.GOOGLE_CSE_API_KEY?.trim() && process.env.GOOGLE_CSE_ID?.trim()
  );
}

export async function searchGoogleCseImages(
  query: string,
  limit = 4
): Promise<ImageSearchHit[]> {
  const apiKey =
    process.env.GOOGLE_CSE_API_KEY?.trim() ??
    process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_ID?.trim();

  if (!apiKey || !cx || !query.trim()) {
    return [];
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    searchType: "image",
    q: `${query.trim()}${FASHION_QUERY_SUFFIX}`,
    num: String(Math.min(Math.max(limit, 1), 10)),
    safe: "active",
  });

  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    items?: Array<{
      title?: string;
      link?: string;
      image?: { thumbnailLink?: string };
    }>;
  };

  return (payload.items ?? [])
    .map((item) => ({
      url: item.link?.trim() ?? "",
      title: item.title?.trim() || "Similar item",
      thumbnail: item.image?.thumbnailLink,
    }))
    .filter((item) => item.url.length > 0)
    .slice(0, limit);
}
