import * as cheerio from "cheerio";
import { cleanUrl } from "@/lib/share/clean-url";
import { assertSafeOutboundUrl } from "@/lib/server/ssrf-guard";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 256 * 1024;

export type UrlPageMetadata = {
  url: string;
  domain: string;
  title: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
};

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readHtmlSnippet(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  try {
    while (bytesRead < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) {
        break;
      }

      bytesRead += value.byteLength;
      chunks.push(value);

      if (bytesRead >= MAX_HTML_BYTES) {
        await reader.cancel();
        break;
      }
    }
  } catch {
    // use buffered bytes
  }

  if (chunks.length === 0) {
    return "";
  }

  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

function readMeta($: cheerio.CheerioAPI, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const node =
    $(`meta[property="${key}"]`).first().attr("content") ??
    $(`meta[name="${key}"]`).first().attr("content") ??
    $(`meta[property='${key}']`).first().attr("content") ??
    $(`meta[name='${key}']`).first().attr("content");

  return node?.trim() ? decodeEntities(node.trim()) : null;
}

export function parseUrlPageMetadata(html: string, pageUrl: string): UrlPageMetadata {
  const $ = cheerio.load(html, { scriptingEnabled: false });
  const parsed = new URL(pageUrl);
  const domain = parsed.hostname.replace(/^www\./, "");

  const titleTag = $("title").first().text().trim();
  const title = titleTag ? decodeEntities(titleTag) : null;
  const ogTitle = readMeta($, "og:title");
  const ogDescription = readMeta($, "og:description");

  return {
    url: pageUrl,
    domain,
    title,
    ogTitle,
    ogDescription,
  };
}

/** Lightweight cheerio scrape — title + og:title + og:description only. */
export async function scrapeUrlMetadata(rawUrl: string): Promise<UrlPageMetadata> {
  const cleaned = cleanUrl(rawUrl);
  const safeUrl = assertSafeOutboundUrl(cleaned);
  const parsed = new URL(safeUrl);
  const domain = parsed.hostname.replace(/^www\./, "");

  try {
    const response = await fetch(safeUrl, {
      headers: {
        Accept: "text/html;q=0.9,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        url: safeUrl,
        domain,
        title: null,
        ogTitle: null,
        ogDescription: null,
      };
    }

    const html = await readHtmlSnippet(response);
    if (!html.trim()) {
      return {
        url: safeUrl,
        domain,
        title: null,
        ogTitle: null,
        ogDescription: null,
      };
    }

    return parseUrlPageMetadata(html, safeUrl);
  } catch {
    return {
      url: safeUrl,
      domain,
      title: null,
      ogTitle: null,
      ogDescription: null,
    };
  }
}

export function pickUrlDisplayTitle(metadata: UrlPageMetadata) {
  return metadata.ogTitle ?? metadata.title ?? metadata.domain;
}

export function pickUrlSummary(metadata: UrlPageMetadata) {
  return metadata.ogDescription ?? null;
}
