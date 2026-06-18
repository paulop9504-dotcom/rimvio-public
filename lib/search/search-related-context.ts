import type { SearchableExperienceRow } from "@/lib/search/build-searchable-experience-index";

export type RelatedContextHit = SearchableExperienceRow & {
  score: number;
  matchedTerms: string[];
};

function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s,·]+/u)
    .map((token) => token.replace(/[?!.…]/gu, "").trim())
    .filter((token) => token.length >= 2);
}

function scoreRow(row: SearchableExperienceRow, terms: string[]): {
  score: number;
  matchedTerms: string[];
} {
  if (terms.length === 0) {
    return { score: 0, matchedTerms: [] };
  }

  let score = 0;
  const matched = new Set<string>();

  for (const term of terms) {
    if (row.searchBlob.includes(term)) {
      matched.add(term);
      score += 10;
    }
    if (row.headline.toLowerCase().includes(term)) {
      score += 8;
    }
    if (row.peerDisplayName?.toLowerCase().includes(term)) {
      score += 12;
    }
    if (row.place?.toLowerCase().includes(term)) {
      score += 12;
    }
  }

  if (matched.size === terms.length) {
    score += 6;
  }

  score += Math.min(row.captureCount, 5);

  return { score, matchedTerms: [...matched] };
}

export function rankRelatedContext(
  index: readonly SearchableExperienceRow[],
  terms: readonly string[],
  options?: { excludeEventId?: string | null; limit?: number },
): RelatedContextHit[] {
  const normalized = terms
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 2);
  if (normalized.length === 0) {
    return [];
  }

  const exclude = options?.excludeEventId?.trim();
  const limit = options?.limit ?? 8;

  return index
    .map((row) => {
      const { score, matchedTerms } = scoreRow(row, normalized);
      return { ...row, score, matchedTerms };
    })
    .filter((row) => row.score > 0 && row.eventId !== exclude)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Pure search — rank experience nodes by peer · place · headline match. */
export function searchRelatedContext(
  index: readonly SearchableExperienceRow[],
  query: string,
  limit = 8,
): RelatedContextHit[] {
  return rankRelatedContext(index, tokenizeQuery(query), { limit });
}
