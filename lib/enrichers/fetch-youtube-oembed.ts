import { normalizeYouTubeUrl } from "@/lib/enrichers/youtube-url";

const FETCH_TIMEOUT_MS = 6_000;

export type YouTubeOEmbed = {
  title: string | null;
  thumbnail_url: string | null;
  author_name: string | null;
};

export async function fetchYouTubeOEmbed(
  rawUrl: string
): Promise<YouTubeOEmbed | null> {
  const videoUrl = normalizeYouTubeUrl(rawUrl);

  try {
    const endpoint = new URL("https://www.youtube.com/oembed");
    endpoint.searchParams.set("url", videoUrl);
    endpoint.searchParams.set("format", "json");

    const response = await fetch(endpoint.href, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      title?: string;
      thumbnail_url?: string;
      author_name?: string;
    };

    return {
      title: data.title?.trim() || null,
      thumbnail_url: data.thumbnail_url?.trim() || null,
      author_name: data.author_name?.trim() || null,
    };
  } catch {
    return null;
  }
}
