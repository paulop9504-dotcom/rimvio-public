import { shouldTrustClientTitle } from "@/lib/share/trusted-link-title";

const URL_IN_TEXT =
  /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;

const BEAM_PATH = /^\/s\/([a-z0-9]{6,32})\/?$/i;

const BARE_DOMAIN =
  /(?:^|[\s,;|]|^)([a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+\.[a-z]{2,}(?:\/[^\s,;|]*)?)/gi;

const COMMON_TLDS =
  "com|co\\.kr|kr|net|org|io|me|app|dev|tv|shop|ai|co|uk|jp|cn|tw|ph|id|vn|th|de|fr|es|it|in|us|xyz|site|page|link|vercel\\.app|github\\.io|notion\\.site|pages\\.dev";

const BARE_DOMAIN_STRICT = new RegExp(
  `(?:^|[\\s,;|]|^)((?:[a-z0-9-]+\\.)+(?:${COMMON_TLDS})(?:\\/[^\\s,;|]*)?)`,
  "gi"
);

function stripTrailingPunctuation(value: string) {
  return value.replace(/[)\]}>,.!?;:'"]+$/g, "");
}

/** Google 번역 URL → 원본 페이지 URL */
export function unwrapTranslateUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    );

    if (!/translate\.google\./i.test(parsed.hostname)) {
      return parsed.href;
    }

    const embedded =
      parsed.searchParams.get("u") ??
      parsed.searchParams.get("url") ??
      parsed.hash.match(/[?&]u=([^&]+)/)?.[1];

    if (embedded) {
      return unwrapTranslateUrl(decodeURIComponent(embedded));
    }
  } catch {
    // fall through
  }

  return trimmed;
}

export function parseBeamSlugFromUrl(raw: string): string | null {
  const candidate = unwrapTranslateUrl(raw);

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`
    );
    const match = parsed.pathname.match(BEAM_PATH);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function normalizeCandidate(raw: string) {
  const unwrapped = unwrapTranslateUrl(raw);
  const trimmed = stripTrailingPunctuation(unwrapped.trim());
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : trimmed.startsWith("www.") || trimmed.includes("/") || trimmed.includes(".")
      ? `https://${trimmed}`
      : null;

  if (!withProtocol) {
    return null;
  }

  try {
    return new URL(withProtocol).href;
  } catch {
    return null;
  }
}

export function normalizeShareUrl(raw: string) {
  const normalized = normalizeCandidate(raw);
  if (!normalized) {
    throw new Error("Invalid URL");
  }

  return normalized;
}

export function parseSharePayload(input: {
  title?: string;
  text?: string;
  url?: string;
}) {
  const title = input.title?.trim() || null;
  const text = input.text?.trim() || "";
  const explicitUrl = input.url?.trim() || "";

  if (explicitUrl) {
    const normalized = normalizeCandidate(explicitUrl);
    if (normalized) {
      return {
        url: normalized,
        title:
          title && shouldTrustClientTitle(normalized, title) ? title : null,
      };
    }
  }

  const all = extractUrlsFromChatText(text);
  if (all.length > 0) {
    const normalized = all[0];
    const leftoverTitle = text.replace(normalized, "").trim();

    const mergedTitle = title || leftoverTitle || null;

    return {
      url: normalized,
      title:
        mergedTitle && shouldTrustClientTitle(normalized, mergedTitle)
          ? mergedTitle
          : null,
    };
  }

  return { url: null, title };
}

export type ParsedManualLink = {
  url: string;
  title: string | null;
  beamSlug: string | null;
};

export type ParsedManualLinkInput = {
  url: string | null;
  title: string | null;
  beamSlug: string | null;
};

/** Inbox / manual entry — accepts bare URL, domain path, or text containing a URL. */
export function parseManualLinkInput(raw: string): ParsedManualLinkInput {
  const all = parseAllManualLinkInputs(raw);
  if (all.length === 0) {
    return { url: null, title: null, beamSlug: null };
  }

  return all[0];
}

/** Free-form paste — every URL/beam link in one blob. */
export function parseAllManualLinkInputs(raw: string): ParsedManualLink[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  const seen = new Set<string>();
  const results: ParsedManualLink[] = [];

  const push = (url: string, title: string | null = null) => {
    const normalized = normalizeCandidate(url);
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    results.push({
      url: normalized,
      title,
      beamSlug: parseBeamSlugFromUrl(normalized),
    });
  };

  const direct = normalizeCandidate(trimmed);
  if (direct && !trimmed.includes("\n") && !/[\s,;|].*https?:\/\//i.test(trimmed)) {
    const singleLineUrls = extractUrlsFromChatText(trimmed);
    if (singleLineUrls.length <= 1) {
      push(direct);
      return results;
    }
  }

  for (const url of extractUrlsFromChatText(trimmed)) {
    push(url);
  }

  if (results.length === 0) {
    const fallback = parseSharePayload({ url: trimmed, text: trimmed });
    if (fallback.url) {
      push(fallback.url, fallback.title);
    }
  }

  return results;
}

function collectRegexMatches(text: string, pattern: RegExp) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  return [...text.matchAll(re)];
}

/** Extract every http(s) URL from free-form chat text. */
export function extractUrlsFromChatText(text: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  const push = (raw: string) => {
    const normalized = normalizeCandidate(raw);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      results.push(normalized);
    }
  };

  for (const match of collectRegexMatches(text, URL_IN_TEXT)) {
    push(match[0]);
  }

  for (const match of collectRegexMatches(text, BARE_DOMAIN_STRICT)) {
    push(match[1] ?? match[0]);
  }

  for (const match of collectRegexMatches(text, BARE_DOMAIN)) {
    push(match[1] ?? match[0]);
  }

  return results;
}
