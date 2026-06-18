import * as cheerio from "cheerio";
import {
  concatBytes,
  decodeHtmlBytes,
  parseCharsetFromContentType,
} from "@/lib/enrichers/html-encoding";
import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 256 * 1024;

const SKIP_HREF =
  /^(?:#|javascript:|mailto:|tel:|data:|blob:|about:)/i;
const SKIP_EXTENSION =
  /\.(?:css|js|json|xml|png|jpe?g|gif|webp|svg|ico|woff2?|mp4|mp3|pdf|zip|gz|apk|exe)(\?|$)/i;
const SKIP_PATH =
  /(?:\/login|\/signin|\/signup|\/logout|\/auth|\/account|\/cart|\/checkout|\/privacy|\/terms|\/help|\/support|\/ads?|\/adclick|\/vote\b|\/comment\/|\/cluster\/|\/section\/\d+\/?$|\/tvHome|\/trending\?|\/user\?|\/ask\/?$|\/my\/home|\/game\/?$|\/newcomments|\/from\?|\/solutions\/)/i;
const SKIP_QUERY = /(?:[?&](?:how=up|goto=news|DA=RT1|w=tot)\b)/i;
const SKIP_HOST_PATH =
  /github\.com\/trending(?:\?|$)|news\.ycombinator\.com\/vote|m\.news\.naver\.com\/tvHome|news\.naver\.com\/section\/\d+\/?$/i;

export type CrawlPageLinksOptions = {
  maxLinks?: number;
  sameHostOnly?: boolean;
  includeSubdomains?: boolean;
};

export type CrawledAnchorLink = {
  url: string;
  anchorText: string | null;
};

function hostKey(hostname: string) {
  return hostname.replace(/^www\./, "").toLowerCase();
}

function isSameSite(left: string, right: string, includeSubdomains: boolean) {
  const a = hostKey(left);
  const b = hostKey(right);

  if (a === b) {
    return true;
  }

  if (!includeSubdomains) {
    return false;
  }

  return a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

async function readHtmlSnippet(response: Response, outerSignal: AbortSignal) {
  const declaredCharset = parseCharsetFromContentType(
    response.headers.get("content-type")
  );

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    const slice = bytes.slice(0, MAX_HTML_BYTES);
    return decodeHtmlBytes(slice, declaredCharset);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  try {
    while (!outerSignal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
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
    // Use buffered bytes.
  }

  if (chunks.length === 0) {
    return "";
  }

  return decodeHtmlBytes(concatBytes(chunks), declaredCharset);
}

function normalizeCrawledHref(seedUrl: string, href: string | undefined) {
  if (!href?.trim() || SKIP_HREF.test(href.trim())) {
    return null;
  }

  try {
    const resolved = new URL(href.trim(), seedUrl);
    if (!["http:", "https:"].includes(resolved.protocol)) {
      return null;
    }

    resolved.hash = "";
    const normalized = resolved.href;

    if (SKIP_EXTENSION.test(normalized) || SKIP_PATH.test(normalized)) {
      return null;
    }

    if (SKIP_QUERY.test(normalized) || SKIP_HOST_PATH.test(normalized)) {
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

export function extractAnchorLinksFromHtml(
  seedUrl: string,
  html: string,
  options?: CrawlPageLinksOptions
): CrawledAnchorLink[] {
  const maxLinks = options?.maxLinks ?? 40;
  const sameHostOnly = options?.sameHostOnly ?? false;
  const includeSubdomains = options?.includeSubdomains ?? true;

  const seedHost = hostKey(new URL(seedUrl).hostname);
  const $ = cheerio.load(html, { scriptingEnabled: false });
  const seen = new Set<string>();
  const links: CrawledAnchorLink[] = [];

  $("a[href]").each((_index, element) => {
    if (links.length >= maxLinks * 3) {
      return false;
    }

    const href = normalizeCrawledHref(seedUrl, $(element).attr("href"));
    if (!href || seen.has(href)) {
      return;
    }

    const linkHost = hostKey(new URL(href).hostname);
    if (sameHostOnly && !isSameSite(linkHost, seedHost, includeSubdomains)) {
      return;
    }

    const anchorText =
      $(element).text().replace(/\s+/g, " ").trim().slice(0, 160) || null;

    seen.add(href);
    links.push({ url: href, anchorText });
  });

  return links.slice(0, maxLinks * 3);
}

export function extractLinksFromHtml(
  seedUrl: string,
  html: string,
  options?: CrawlPageLinksOptions
) {
  return extractAnchorLinksFromHtml(seedUrl, html, options).map((link) => link.url);
}

async function fetchPageHtml(rawSeedUrl: string) {
  const parsed = normalizeInputUrl(rawSeedUrl);
  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  const response = await fetch(parsed.href, {
    headers: {
      Accept: "text/html;q=0.9,application/xhtml+xml;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.5",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    },
    redirect: "follow",
    signal: timeoutSignal,
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const html = await readHtmlSnippet(response, timeoutSignal);
  return { seedUrl: parsed.href, html };
}

export async function crawlAnchorLinksFromPage(
  rawSeedUrl: string,
  options?: CrawlPageLinksOptions
): Promise<CrawledAnchorLink[]> {
  try {
    const fetched = await fetchPageHtml(rawSeedUrl);
    if (!fetched) {
      return [];
    }

    return extractAnchorLinksFromHtml(fetched.seedUrl, fetched.html, options);
  } catch {
    return [];
  }
}

export async function crawlLinksFromPage(
  rawSeedUrl: string,
  options?: CrawlPageLinksOptions
): Promise<string[]> {
  const links = await crawlAnchorLinksFromPage(rawSeedUrl, options);
  return links.map((link) => link.url);
}

/** Pick diverse crawled links while keeping anchor text. */
export function pickDiverseAnchorLinks(
  links: CrawledAnchorLink[],
  count: number,
  maxPerHost = 2
) {
  const shuffled = shufflePick(links, links.length);
  const hostCounts = new Map<string, number>();
  const picked: CrawledAnchorLink[] = [];

  for (const link of shuffled) {
    if (picked.length >= count) {
      break;
    }

    let host = "unknown";
    try {
      host = hostKey(new URL(link.url).hostname);
    } catch {
      continue;
    }

    const used = hostCounts.get(host) ?? 0;
    if (used >= maxPerHost) {
      continue;
    }

    hostCounts.set(host, used + 1);
    picked.push(link);
  }

  return picked;
}

export function shufflePick<T>(items: T[], count: number): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy.slice(0, Math.max(0, count));
}

/** Pick diverse URLs — at most `maxPerHost` links per hostname. */
export function pickDiverseLinks(urls: string[], count: number, maxPerHost = 2) {
  const shuffled = shufflePick(urls, urls.length);
  const hostCounts = new Map<string, number>();
  const picked: string[] = [];

  for (const url of shuffled) {
    if (picked.length >= count) {
      break;
    }

    let host = "unknown";
    try {
      host = hostKey(new URL(url).hostname);
    } catch {
      continue;
    }

    const used = hostCounts.get(host) ?? 0;
    if (used >= maxPerHost) {
      continue;
    }

    hostCounts.set(host, used + 1);
    picked.push(url);
  }

  return picked;
}
