import * as cheerio from "cheerio";
import { cleanPageTitle } from "@/lib/enrichers/clean-page-title";
import { extractPhoneFromHtml, extractPhoneFromText } from "@/lib/enrichers/extract-phone";
import {
  concatBytes,
  decodeHtmlBytes,
  parseCharsetFromContentType,
} from "@/lib/enrichers/html-encoding";
import { buildDomainFallback } from "@/lib/utils/domain-gradient";
import type { PageMetadata } from "@/lib/enrichers/types";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 512 * 1024;

const META_KEYS = {
  title: ["og:title", "twitter:title", "title"],
  image: ["og:image", "twitter:image", "twitter:image:src", "image"],
  description: ["og:description", "twitter:description", "description"],
} as const;

function decodeHtmlEntities(value: string) {
  const named = value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .trim();

  return named
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetaContent(html: string, keys: readonly string[]) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["']`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        return decodeHtmlEntities(match[1]);
      }
    }
  }

  return null;
}

function extractTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
}

function extractItempropContent(html: string, itemprop: string) {
  const escaped = itemprop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<[^>]*itemprop=["']${escaped}["'][^>]*content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<[^>]*itemprop=["']${escaped}["'][^>]*>([^<]{2,200})<`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }

  return null;
}

function extractFirstHeading(html: string) {
  const match = html.match(/<h1[^>]*>([\s\S]{2,200}?)<\/h1>/i);
  if (!match?.[1]) {
    return null;
  }

  const stripped = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return stripped ? decodeHtmlEntities(stripped) : null;
}

function collectJsonLdNodes(value: unknown): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];

  const walk = (input: unknown) => {
    if (!input) {
      return;
    }

    if (Array.isArray(input)) {
      input.forEach(walk);
      return;
    }

    if (typeof input !== "object") {
      return;
    }

    const record = input as Record<string, unknown>;
    if (record["@graph"]) {
      walk(record["@graph"]);
      return;
    }

    nodes.push(record);
  };

  walk(value);
  return nodes;
}

function pickJsonLdField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readMeta($: cheerio.CheerioAPI, names: string[]): string | null {
  for (const name of names) {
    const value =
      $(`meta[property="${name}"]`).attr("content") ??
      $(`meta[name="${name}"]`).attr("content");

    if (value?.trim()) {
      return decodeHtmlEntities(value);
    }
  }

  return null;
}

function extractSiteName(html: string, $: cheerio.CheerioAPI) {
  return (
    extractMetaContent(html, ["og:site_name", "application-name"]) ??
    readMeta($, ["og:site_name", "application-name"])
  );
}

function extractCanonicalUrl(html: string, $: cheerio.CheerioAPI, baseUrl: string) {
  const href =
    $('link[rel="canonical"]').attr("href") ??
    extractMetaContent(html, ["og:url"]) ??
    readMeta($, ["og:url"]);

  return resolveUrl(baseUrl, href);
}

function extractIconImage(html: string, $: cheerio.CheerioAPI, baseUrl: string) {
  const candidates = [
    readMeta($, ["og:image", "twitter:image", "twitter:image:src", "image"]),
    $('link[rel="apple-touch-icon"]').attr("href"),
    $('link[rel="apple-touch-icon-precomposed"]').attr("href"),
    $('link[rel="icon"][sizes="192x192"]').attr("href"),
    $('link[rel="icon"]').attr("href"),
    $('link[rel="shortcut icon"]').attr("href"),
  ];

  for (const candidate of candidates) {
    const resolved = resolveUrl(baseUrl, candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function extractBodyHeading(html: string, $: cheerio.CheerioAPI) {
  const articleTitle =
    $("article h1").first().text().trim() ||
    $('[role="main"] h1').first().text().trim() ||
    $("main h1").first().text().trim() ||
    extractFirstHeading(html);

  return articleTitle ? decodeHtmlEntities(articleTitle) : null;
}

function extractJsonLdPrice(value: unknown): number | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const rawPrice = record.price ?? record.lowPrice ?? record.highPrice;

  if (typeof rawPrice === "number" && Number.isFinite(rawPrice) && rawPrice > 0) {
    return Math.round(rawPrice);
  }

  if (typeof rawPrice === "string") {
    const parsed = Number.parseInt(rawPrice.replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function extractJsonLdMetadata(headHtml: string) {
  const scripts = headHtml.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const nodes = collectJsonLdNodes(parsed);

      for (const record of nodes) {
        const typeValue = record["@type"];
        const types = Array.isArray(typeValue)
          ? typeValue.map(String)
          : typeValue
            ? [String(typeValue)]
            : [];

        const isContentType = types.some((type) =>
          /Product|Article|NewsArticle|WebPage|VideoObject|Place|Event|Offer/i.test(type)
        );

        const title =
          pickJsonLdField(record, ["name", "headline", "alternateName"]) ??
          (isContentType
            ? pickJsonLdField(record, ["name", "headline"])
            : null);
        const description = pickJsonLdField(record, ["description"]);
        const image = extractJsonLdImage(record.image);
        const offers = record.offers;
        const priceWon =
          extractJsonLdPrice(offers) ??
          (Array.isArray(offers)
            ? offers.map(extractJsonLdPrice).find((price) => price !== null) ?? null
            : null);

        if (title || description || image || priceWon) {
          return { title, description, image, priceWon };
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return null;
}

function extractJsonLdImage(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const image = extractJsonLdImage(item);
      if (image) {
        return image;
      }
    }
    return null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.url === "string") {
      return record.url;
    }
  }

  return null;
}

function parsePageMetadata(html: string, baseUrl: string) {
  const regexTitle =
    extractMetaContent(html, META_KEYS.title) ?? extractTitleTag(html);

  const regexImage = extractMetaContent(html, META_KEYS.image);
  const regexDescription = extractMetaContent(html, META_KEYS.description);

  const $ = cheerio.load(html, { scriptingEnabled: false });
  const jsonLd = extractJsonLdMetadata(html);
  const siteName = extractSiteName(html, $);
  const canonicalUrl = extractCanonicalUrl(html, $, baseUrl);

  const rawTitle =
    regexTitle ??
    readMeta($, [...META_KEYS.title]) ??
    extractItempropContent(html, "name") ??
    jsonLd?.title ??
    extractBodyHeading(html, $) ??
    $("title").first().text().trim() ??
    null;

  const rawImage =
    regexImage ??
    readMeta($, [...META_KEYS.image]) ??
    extractItempropContent(html, "image") ??
    jsonLd?.image ??
    extractIconImage(html, $, baseUrl) ??
    null;

  const description =
    regexDescription ??
    readMeta($, [...META_KEYS.description]) ??
    extractItempropContent(html, "description") ??
    jsonLd?.description ??
    null;

  return {
    title: cleanPageTitle(rawTitle, siteName) ?? rawTitle,
    image: resolveUrl(canonicalUrl ?? baseUrl, rawImage),
    description,
    priceWon: jsonLd?.priceWon ?? null,
    siteName,
    canonicalUrl,
  };
}

function resolveUrl(base: string, maybeRelative?: string | null) {
  if (!maybeRelative?.trim()) {
    return null;
  }

  try {
    return new URL(maybeRelative.trim(), base).href;
  } catch {
    return null;
  }
}

export function normalizeInputUrl(raw: string) {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const parsed = new URL(withProtocol);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http(s) URLs are allowed.");
  }

  return parsed;
}

async function readHtmlSnippet(
  response: Response,
  outerSignal: AbortSignal
): Promise<string> {
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

export async function fetchPageMetadata(rawUrl: string): Promise<PageMetadata> {
  const parsed = normalizeInputUrl(rawUrl);
  const url = parsed.href;
  const domain = parsed.hostname.replace(/^www\./, "");
  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
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
      return { url, domain, title: null, image: null, description: null, phone: null, priceWon: null };
    }

    const html = await readHtmlSnippet(response, timeoutSignal);
    const metadata = parsePageMetadata(html, url);
    const phone =
      extractPhoneFromHtml(html) ??
      extractPhoneFromText(metadata.description) ??
      extractPhoneFromText(metadata.title);

    const resolvedUrl = metadata.canonicalUrl ?? url;

    return {
      url: resolvedUrl,
      domain,
      title: metadata.title,
      image: metadata.image,
      description: metadata.description,
      phone,
      priceWon: metadata.priceWon ?? null,
    };
  } catch {
    return {
      url,
      domain,
      title: null,
      image: null,
      description: null,
      phone: null,
      priceWon: null,
    };
  }
}

export function withDomainFallback(
  metadata: PageMetadata,
  partial: {
    title?: string | null;
    image?: string | null;
    description?: string | null;
  } = {}
) {
  const domainFallback = buildDomainFallback(metadata.domain);
  const title = partial.title?.trim() || domainFallback.title;
  const image = partial.image?.trim() || null;

  return {
    url: metadata.url,
    domain: domainFallback.domain,
    title,
    image,
    description: partial.description?.trim() || null,
    fallback: {
      gradient: domainFallback.gradient,
      initial: domainFallback.initial,
      titleFromDomain: !partial.title?.trim(),
      imageFromFallback: !partial.image?.trim(),
    },
  };
}
