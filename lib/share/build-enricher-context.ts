"use client";

import { readLocalLinks } from "@/lib/local-links/store";
import type { EnricherContext } from "@/lib/enrichers/types";
import { aggregateCategoryWeights } from "@/lib/personalization/inbox-profile";
import { aggregateSuiteWeights } from "@/lib/personalization/suite-profile";
import { readSuiteTaste } from "@/lib/preferences/suite-taste";
import { inferEnricherContext } from "@/lib/share/infer-context";

export function buildEnricherContext(): EnricherContext {
  const base = inferEnricherContext();
  const pinnedSuites = readSuiteTaste();
  const links = readLocalLinks();

  if (links.length === 0) {
    return {
      ...base,
      pinnedSuites,
    };
  }

  const categoryWeights = aggregateCategoryWeights(links);
  const suiteWeights = aggregateSuiteWeights(links);

  return {
    ...base,
    categoryWeights,
    suiteWeights,
    pinnedSuites,
  };
}
