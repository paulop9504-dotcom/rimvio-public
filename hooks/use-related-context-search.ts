"use client";

import { useCallback, useState } from "react";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { buildSearchableExperienceIndex } from "@/lib/search/build-searchable-experience-index";
import {
  searchRelatedContextByAxes,
  type RelatedContextSearchResult,
} from "@/lib/search/search-related-context-by-axis";

export function useRelatedContextSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<RelatedContextSearchResult | null>(null);
  const [active, setActive] = useState(false);

  const search = useCallback((raw: string) => {
    const trimmed = raw.trim();
    setQuery(trimmed);
    if (!trimmed) {
      setResult(null);
      setActive(false);
      return null;
    }
    const index = buildSearchableExperienceIndex(listLifeEventCandidates());
    const next = searchRelatedContextByAxes(index, trimmed);
    setResult(next);
    setActive(true);
    return next;
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResult(null);
    setActive(false);
  }, []);

  return {
    query,
    result,
    active,
    search,
    clear,
  };
}
