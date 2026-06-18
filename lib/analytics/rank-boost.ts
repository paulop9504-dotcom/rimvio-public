import type { BlinkAnalyticsEvent } from "@/lib/analytics/types";
import { toActionKey } from "@/lib/intent/action-key";
import { rankActionsByContext } from "@/lib/enrichers/rank-actions";
import type { EnricherContext } from "@/lib/enrichers/types";
import type { EnrichedLink } from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

export type ActionClickAggregate = {
  byActionKey: Map<string, number>;
  byLabel: Map<string, number>;
  byKeyword: Map<string, number>;
};

const KEYWORD_PATTERNS = [
  "카카오T",
  "카카오맵",
  "카카오 T",
  "네이버지도",
  "길찾기",
  "배민",
  "쿠팡",
  "YouTube",
  "복사",
] as const;

const MIN_CLICKS_FOR_BOOST = 2;
const CLICK_WEIGHT = 18;
const DOMAIN_CLICK_WEIGHT = 28;
const KEYWORD_WEIGHT = 12;

export function normalizeActionLabelKey(label: string) {
  return label
    .replace(/^[^\p{L}\p{N}]+/gu, "")
    .trim()
    .toLowerCase();
}

function bump(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function syntheticActionKey(event: Extract<BlinkAnalyticsEvent, { type: "action_click" }>) {
  const icon =
    typeof event.actionKind === "string" ? event.actionKind : "open";
  return `${icon}:${normalizeActionLabelKey(event.actionLabel) || "action"}`;
}

export function aggregateActionClickStats(
  events: BlinkAnalyticsEvent[],
  filter?: { domain?: string; enricher_id?: string | null }
): ActionClickAggregate {
  const byActionKey = new Map<string, number>();
  const byLabel = new Map<string, number>();
  const byKeyword = new Map<string, number>();

  for (const event of events) {
    if (event.type !== "action_click") {
      continue;
    }

    const labelKey = normalizeActionLabelKey(event.actionLabel);
    bump(byLabel, labelKey);

    if (filter?.domain && event.domain === filter.domain) {
      bump(byActionKey, syntheticActionKey(event), DOMAIN_CLICK_WEIGHT / CLICK_WEIGHT);
    }

    bump(byActionKey, syntheticActionKey(event));

    for (const keyword of KEYWORD_PATTERNS) {
      if (event.actionLabel.includes(keyword)) {
        bump(byKeyword, keyword);
      }
    }
  }

  return { byActionKey, byLabel, byKeyword };
}

export function analyticsBoostForAction(
  action: LinkActionItem,
  stats: ActionClickAggregate
) {
  let boost = 0;
  const actionKey = toActionKey(action);
  const labelKey = normalizeActionLabelKey(action.label);

  const keyClicks = stats.byActionKey.get(actionKey) ?? 0;
  if (keyClicks >= MIN_CLICKS_FOR_BOOST) {
    boost += keyClicks * CLICK_WEIGHT;
  }

  const labelClicks = stats.byLabel.get(labelKey) ?? 0;
  if (labelClicks >= MIN_CLICKS_FOR_BOOST) {
    boost += labelClicks * (CLICK_WEIGHT * 0.6);
  }

  for (const keyword of KEYWORD_PATTERNS) {
    if (!action.label.includes(keyword)) {
      continue;
    }

    const keywordClicks = stats.byKeyword.get(keyword) ?? 0;
    if (keywordClicks >= MIN_CLICKS_FOR_BOOST) {
      boost += keywordClicks * KEYWORD_WEIGHT;
    }
  }

  return boost;
}

export function rankActionsWithAnalyticsBoost(
  actions: LinkActionItem[],
  context: EnricherContext,
  sourceUrl: string,
  stats: ActionClickAggregate | null | undefined,
  options?: { pinTopAction?: boolean }
): LinkActionItem[] {
  if (actions.length <= 1 || !stats) {
    return actions;
  }

  const ruleRanked = rankActionsByContext(actions, context, sourceUrl);

  const scored = ruleRanked.map((action, index) => ({
    action,
    score: analyticsBoostForAction(action, stats) - index * 0.01,
  }));

  scored.sort((left, right) => right.score - left.score);
  const ranked = scored.map((entry) => entry.action);

  if (!options?.pinTopAction) {
    return ranked;
  }

  const [pinned, ...rest] = actions;
  const restRanked = rankActionsWithAnalyticsBoost(
    rest,
    context,
    sourceUrl,
    stats,
    { pinTopAction: false }
  );

  return [pinned, ...restRanked];
}

export function boostEnrichedWithAnalytics(
  enriched: EnrichedLink,
  events: BlinkAnalyticsEvent[],
  context: EnricherContext
): EnrichedLink {
  if (enriched.actions.length <= 1) {
    return enriched;
  }

  const globalStats = aggregateActionClickStats(events);
  const scopedStats = aggregateActionClickStats(events, {
    domain: enriched.domain,
    enricher_id: enriched.enricher_id,
  });

  const merged: ActionClickAggregate = {
    byActionKey: new Map([
      ...globalStats.byActionKey,
      ...scopedStats.byActionKey,
    ]),
    byLabel: new Map([...globalStats.byLabel, ...scopedStats.byLabel]),
    byKeyword: new Map([
      ...globalStats.byKeyword,
      ...scopedStats.byKeyword,
    ]),
  };

  const hasSignal =
    merged.byActionKey.size > 0 &&
    [...merged.byActionKey.values()].some((count) => count >= MIN_CLICKS_FOR_BOOST);

  if (!hasSignal && [...merged.byKeyword.values()].every((c) => c < MIN_CLICKS_FOR_BOOST)) {
    return enriched;
  }

  const actions = rankActionsWithAnalyticsBoost(
    enriched.actions,
    context,
    enriched.url,
    merged,
    { pinTopAction: true }
  );

  return { ...enriched, actions };
}
