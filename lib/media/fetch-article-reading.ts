import { estimateReadingMinutesFromText } from "@/lib/media/estimate-reading-time";
import { fetchPageMetadata } from "@/lib/enrichers/fetch-page-metadata";
import {
  extractReadableText,
  fetchArticleHtml,
} from "@/lib/media/article-text";

export async function fetchArticleReadingMinutes(rawUrl: string) {
  try {
    const html = await fetchArticleHtml(rawUrl);
    if (html) {
      const fromBody = estimateReadingMinutesFromText(extractReadableText(html));
      if (fromBody) {
        return fromBody;
      }
    }
  } catch {
    // Fall through to metadata description.
  }

  try {
    const metadata = await fetchPageMetadata(rawUrl);
    const combined = [metadata.title, metadata.description].filter(Boolean).join("\n\n");
    return estimateReadingMinutesFromText(combined);
  } catch {
    return null;
  }
}
