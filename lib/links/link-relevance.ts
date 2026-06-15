import { normalizeLinkCategory } from "@/lib/categories/types";
import { parseBestTitleFromUrl } from "@/lib/enrichers/url-intelligence";

/** Minimum relevance (0–100) to show under feed actions. */
export const RELEVANCE_MIN_SCORE = 80;

export type MainLinkContext = {
  url: string;
  title: string;
  domain: string;
  category?: string | null;
  source_type?: string | null;
};

export type RelatedLinkCandidate = {
  url: string;
  title: string | null;
  domain: string;
  anchorText?: string | null;
  category?: string | null;
  source_type?: string | null;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "from",
  "with",
  "this",
  "that",
  "news",
  "blog",
  "home",
  "main",
  "page",
  "naver",
  "네이버",
  "다음",
  "daum",
  "google",
  "www",
  "com",
  "co",
  "kr",
  "html",
  "article",
  "post",
  "view",
  "detail",
  "more",
  "see",
  "link",
  "links",
  "관련",
  "기사",
  "뉴스",
  "블로그",
  "페이지",
  "홈",
  "전체",
  "목록",
]);

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    return parsed.href.replace(/\/$/, "");
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

function registrableDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function tokenize(text: string | null | undefined) {
  if (!text?.trim()) {
    return [] as string[];
  }

  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

function uniqueTokens(...parts: Array<string | null | undefined>) {
  return [...new Set(parts.flatMap((part) => tokenize(part)))];
}

function overlapRatio(mainTokens: string[], candidateTokens: string[]) {
  if (mainTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  const mainSet = new Set(mainTokens);
  let hits = 0;

  for (const token of candidateTokens) {
    if (mainSet.has(token)) {
      hits += 1;
    }
  }

  return hits / mainSet.size;
}

function jaccard(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let intersection = 0;

  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  const union = leftSet.size + rightSet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function pathTokens(url: string) {
  try {
    const parsed = new URL(url);
    const segments = `${parsed.pathname} ${parsed.search}`
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
    return tokenize(segments);
  } catch {
    return [] as string[];
  }
}

function buildMainTopicTokens(main: MainLinkContext) {
  const urlHint = parseBestTitleFromUrl(main.url, main.domain);
  return uniqueTokens(main.title, urlHint, pathTokens(main.url).join(" "));
}

function buildCandidateTokens(candidate: RelatedLinkCandidate) {
  return uniqueTokens(
    candidate.title,
    candidate.anchorText,
    pathTokens(candidate.url).join(" ")
  );
}

function substringBoost(mainTitle: string, candidateTitle: string | null) {
  const main = mainTitle.trim();
  const candidate = candidateTitle?.trim() ?? "";

  if (main.length < 4 || candidate.length < 4) {
    return 0;
  }

  if (candidate.includes(main) || main.includes(candidate)) {
    return 10;
  }

  const mainTokens = tokenize(main);
  const longest = mainTokens.sort((a, b) => b.length - a.length)[0];

  if (longest && longest.length >= 3 && candidate.toLowerCase().includes(longest)) {
    return 6;
  }

  return 0;
}

/** 0–100 relevance score vs the main link. */
export function scoreLinkRelevance(
  main: MainLinkContext,
  candidate: RelatedLinkCandidate
): number {
  if (normalizeUrl(main.url) === normalizeUrl(candidate.url)) {
    return 0;
  }

  const mainTokens = buildMainTopicTokens(main);
  const candidateTokens = buildCandidateTokens(candidate);
  const anchorTokens = tokenize(candidate.anchorText);

  const titleJaccard = jaccard(mainTokens, candidateTokens);
  const anchorJaccard = jaccard(mainTokens, anchorTokens);
  const titleOverlap = overlapRatio(mainTokens, candidateTokens);
  const pathOverlap = jaccard(pathTokens(main.url), pathTokens(candidate.url));

  let score = 0;

  score += Math.min(35, titleJaccard * 100 * 0.35);
  score += Math.min(30, anchorJaccard * 100 * 0.3);
  score += Math.min(20, titleOverlap * 100 * 0.2);
  score += Math.min(12, pathOverlap * 100 * 0.12);

  if (titleOverlap >= 0.5 || anchorJaccard >= 0.35) {
    score += 12;
  }

  if (registrableDomain(main.domain) === registrableDomain(candidate.domain)) {
    score += 10;
  }

  const mainCategory = normalizeLinkCategory(main.category);
  const candidateCategory = normalizeLinkCategory(candidate.category);

  if (mainCategory !== "uncategorized" && candidateCategory === mainCategory) {
    score += 8;
  }

  if (
    main.source_type &&
    candidate.source_type &&
    main.source_type === candidate.source_type
  ) {
    score += 4;
  }

  score += substringBoost(main.title, candidate.title);

  return Math.round(Math.min(100, score));
}

export function isRelevantLink(
  main: MainLinkContext,
  candidate: RelatedLinkCandidate,
  minScore = RELEVANCE_MIN_SCORE
) {
  return scoreLinkRelevance(main, candidate) >= minScore;
}
