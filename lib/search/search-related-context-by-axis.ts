import type { SearchableExperienceRow } from "@/lib/search/build-searchable-experience-index";
import {
  rankRelatedContext,
  searchRelatedContext,
  type RelatedContextHit,
} from "@/lib/search/search-related-context";
import { splitContextSearchQuery } from "@/lib/search/split-context-search-query";

export type RelatedContextAxisSearch = {
  kind: "people" | "experience";
  terms: readonly string[];
  summaryLine: string;
  hits: readonly RelatedContextHit[];
};

export type RelatedContextSearchResult = {
  query: string;
  people: RelatedContextAxisSearch;
  experience: RelatedContextAxisSearch;
  /** Merged unique hits — both axes interleaved */
  all: readonly RelatedContextHit[];
};

function mergeAxisHits(
  people: readonly RelatedContextHit[],
  experience: readonly RelatedContextHit[],
  limit: number,
): RelatedContextHit[] {
  const seen = new Set<string>();
  const merged: RelatedContextHit[] = [];
  const maxLen = Math.max(people.length, experience.length);
  for (let i = 0; i < maxLen; i += 1) {
    for (const row of [people[i], experience[i]]) {
      if (!row || seen.has(row.eventId)) {
        continue;
      }
      seen.add(row.eventId);
      merged.push(row);
      if (merged.length >= limit) {
        return merged;
      }
    }
  }
  return merged;
}

/** Search index on people · experience axes (수집 탭 + Feed share logic). */
export function searchRelatedContextByAxes(
  index: readonly SearchableExperienceRow[],
  query: string,
  limitPerAxis = 6,
): RelatedContextSearchResult {
  const trimmed = query.trim();
  const { peopleTerms, experienceTerms } = splitContextSearchQuery(trimmed);

  const peopleHits =
    peopleTerms.length > 0
      ? rankRelatedContext(index, peopleTerms, { limit: limitPerAxis })
      : [];
  const experienceHits =
    experienceTerms.length > 0
      ? rankRelatedContext(index, experienceTerms, { limit: limitPerAxis })
      : [];

  const fallbackHits =
    peopleHits.length === 0 && experienceHits.length === 0
      ? searchRelatedContext(index, trimmed, limitPerAxis)
      : [];

  const people: RelatedContextAxisSearch = {
    kind: "people",
    terms: peopleTerms,
    summaryLine: peopleTerms.join(" · "),
    hits: peopleHits,
  };
  const experience: RelatedContextAxisSearch = {
    kind: "experience",
    terms: experienceTerms,
    summaryLine: experienceTerms.join(" · "),
    hits: experienceHits.length > 0 ? experienceHits : fallbackHits,
  };

  return {
    query: trimmed,
    people,
    experience,
    all: mergeAxisHits(peopleHits, experience.hits, limitPerAxis * 2),
  };
}
