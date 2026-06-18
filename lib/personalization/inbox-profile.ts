import {
  LINK_CATEGORIES,
  normalizeLinkCategory,
  type FeedCategoryFilter,
  type LinkCategory,
} from "@/lib/categories/types";
import type { PortalSuiteActionDef } from "@/lib/enrichers/portal-action-suites";
import type { CategoryWeights } from "@/lib/enrichers/types";

const MIN_LINKS_FOR_PROFILE = 4;
const MIN_WEIGHT_FOR_FEED_BIAS = 0.32;

export function aggregateCategoryWeights(
  links: { category: string | null }[],
  options?: { maxLinks?: number }
): CategoryWeights {
  const maxLinks = options?.maxLinks ?? 30;
  const recent = links.slice(0, maxLinks);

  if (recent.length === 0) {
    return {};
  }

  const counts = Object.fromEntries(
    LINK_CATEGORIES.map((category) => [category, 0])
  ) as Record<LinkCategory, number>;

  for (const link of recent) {
    const category = normalizeLinkCategory(link.category);
    counts[category] += 1;
  }

  const total = recent.length;
  const weights: CategoryWeights = {};

  for (const category of LINK_CATEGORIES) {
    weights[category] = counts[category] / total;
  }

  return weights;
}

export function rankPortalSuiteActions(
  actions: PortalSuiteActionDef[],
  weights?: CategoryWeights | null
): PortalSuiteActionDef[] {
  if (!weights || Object.keys(weights).length === 0) {
    return [...actions].sort((a, b) => a.priority - b.priority);
  }

  return [...actions].sort((left, right) => {
    const weightDelta =
      (weights[right.category] ?? 0) - (weights[left.category] ?? 0);

    if (Math.abs(weightDelta) > 0.001) {
      return weightDelta;
    }

    return left.priority - right.priority;
  });
}

/** Feed no longer uses category chips — keep stable default. */
export function suggestFeedCategory(
  _links: { category: string | null }[],
  _weights?: CategoryWeights | null
): FeedCategoryFilter {
  return "all";
}

export function describeCategoryBias(weights: CategoryWeights): string | null {
  const entries = LINK_CATEGORIES.map((category) => ({
    category,
    weight: weights[category] ?? 0,
  }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  if (entries.length === 0 || entries[0].weight < MIN_WEIGHT_FOR_FEED_BIAS) {
    return null;
  }

  const top = entries[0];
  const pct = Math.round(top.weight * 100);
  return `Inbox ${pct}% ${top.category} — 포털 액션 순서에 반영`;
}
