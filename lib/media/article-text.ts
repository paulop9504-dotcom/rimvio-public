import * as cheerio from "cheerio";
import { fetchPageMetadata } from "@/lib/enrichers/fetch-page-metadata";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 512 * 1024;
export const MAX_SPEAK_TEXT_CHARS = 3_000;

export function extractReadableText(html: string) {
  const $ = cheerio.load(html);

  $("script, style, nav, footer, aside, noscript, iframe").remove();

  const chunks = [
    $("article").text(),
    $('[role="main"]').text(),
    $("main").text(),
    $(".se-main-container").text(),
    $("#content").text(),
    $(".post-content").text(),
    $(".article-body").text(),
  ]
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (chunks.length === 0) {
    return null;
  }

  return chunks.sort((left, right) => right.length - left.length)[0] ?? null;
}

export async function fetchArticleHtml(rawUrl: string) {
  const response = await fetch(rawUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.subarray(0, MAX_HTML_BYTES).toString("utf8");
}

export function trimSpeakText(text: string | null | undefined, title?: string | null) {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (normalized && normalized.length >= 24) {
    return normalized.slice(0, MAX_SPEAK_TEXT_CHARS);
  }

  const fallback = [title?.trim(), normalized].filter(Boolean).join(". ").trim();
  return fallback ? fallback.slice(0, MAX_SPEAK_TEXT_CHARS) : null;
}

export async function fetchArticleSpeakText(rawUrl: string, title?: string | null) {
  try {
    const html = await fetchArticleHtml(rawUrl);
    if (html) {
      const fromBody = trimSpeakText(extractReadableText(html), title);
      if (fromBody) {
        return fromBody;
      }
    }
  } catch {
    // Fall through to metadata description.
  }

  try {
    const metadata = await fetchPageMetadata(rawUrl);
    const combined = [metadata.title, metadata.description].filter(Boolean).join(". ");
    return trimSpeakText(combined, title ?? metadata.title);
  } catch {
    return trimSpeakText(title, title);
  }
}
