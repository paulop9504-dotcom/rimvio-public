import { rankActionsByContext } from "@/lib/enrichers/rank-actions";
import type { ActionClickAggregate } from "@/lib/analytics/rank-boost";
import { rankActionsWithAnalyticsBoost } from "@/lib/analytics/rank-boost";
import type { EnricherContext } from "@/lib/enrichers/types";
import { toActionKey } from "@/lib/intent/action-key";
import {
  INTENT_SCORE_WEIGHT,
  MIN_BIN_IMPRESSIONS,
  type ActionBinStat,
} from "@/lib/intent/types";
import type { LinkActionItem } from "@/types/database";

function intentBoost(stat: ActionBinStat | undefined) {
  if (!stat || stat.impressions < MIN_BIN_IMPRESSIONS) {
    return 0;
  }

  const ctr = stat.clicks / stat.impressions;
  const skipRate = stat.skips / stat.impressions;

  return Math.round((ctr - skipRate * 0.5) * INTENT_SCORE_WEIGHT);
}

function buildStatMap(stats: ActionBinStat[]) {
  return new Map(stats.map((stat) => [stat.action_key, stat]));
}

type RankActionsByIntentOptions = {
  pinTopAction?: boolean;
};

/**
 * Rule-based rank first, then lightly nudge using bin stats.
 * Falls back to rules when sample size is too small.
 */
export function rankActionsByIntent(
  actions: LinkActionItem[],
  context: EnricherContext,
  stats: ActionBinStat[],
  sourceUrl: string,
  options?: RankActionsByIntentOptions,
  analyticsStats?: ActionClickAggregate | null
): LinkActionItem[] {
  if (actions.length <= 1) {
    return actions;
  }

  const statMap = buildStatMap(stats);

  let ranked: LinkActionItem[];

  if (statMap.size === 0) {
    ranked = rankActionsByContext(actions, context, sourceUrl);
  } else {
    const ruleRanked = rankActionsByContext(actions, context, sourceUrl);

    const scored = ruleRanked.map((action, index) => ({
      action,
      score: intentBoost(statMap.get(toActionKey(action))) - index * 0.01,
    }));

    scored.sort((left, right) => right.score - left.score);
    ranked = scored.map((entry) => entry.action);
  }

  if (analyticsStats) {
    ranked = rankActionsWithAnalyticsBoost(
      ranked,
      context,
      sourceUrl,
      analyticsStats,
      { pinTopAction: false }
    );
  }

  if (!options?.pinTopAction) {
    return ranked;
  }

  const [pinned, ...rest] = actions;
  const restRanked = rankActionsByIntent(
    rest,
    context,
    stats,
    sourceUrl,
    undefined,
    analyticsStats
  );

  return [pinned, ...restRanked];
}
