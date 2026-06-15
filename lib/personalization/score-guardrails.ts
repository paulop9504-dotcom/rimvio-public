import type { EnricherContext } from "@/lib/enrichers/types";
import { rankActionsByContext } from "@/lib/enrichers/rank-actions";
import { scoreActionEffort } from "@/lib/behavior/fogg";
import { toActionKey } from "@/lib/intent/action-key";
import { INTENT_SCORE_WEIGHT, MIN_BIN_IMPRESSIONS, type ActionBinStat } from "@/lib/intent/types";
import type { LinkActionItem } from "@/types/database";
import { toActionFamily } from "@/lib/personalization/action-family";
import type {
  ActionFamily,
  DomainFamily,
  LinkLifecycleRecord,
  PersonalizationScoreBreakdown,
  RecentActionProfile,
} from "@/lib/personalization/types";
import {
  BLOCKED_PERSONAL_FAMILIES,
  MAX_COMBINED_PERSONAL_STATE_SHARE,
  MAX_PERSONAL_SHARE_OF_RULE,
  MIN_CLICKS_FOR_PERSONAL,
  PERSONAL_MAX,
  PRIMARY_SWAP_MARGIN,
  REVISIT_HOURS_THRESHOLD,
  STATE_MAX,
} from "@/lib/personalization/constants";
import { resolvePrimaryWithHysteresis } from "@/lib/personalization/primary-lock";

function intentBinBoost(action: LinkActionItem, statMap: Map<string, ActionBinStat>) {
  const stat = statMap.get(toActionKey(action));
  if (!stat || stat.impressions < MIN_BIN_IMPRESSIONS) {
    return 0;
  }

  const ctr = stat.clicks / stat.impressions;
  const skipRate = stat.skips / stat.impressions;
  return Math.round((ctr - skipRate * 0.5) * INTENT_SCORE_WEIGHT);
}

function buildRuleScoreMap(
  actions: LinkActionItem[],
  context: EnricherContext,
  sourceUrl: string
) {
  const ranked = rankActionsByContext(actions, context, sourceUrl);
  const map = new Map<string, number>();

  ranked.forEach((action, index) => {
    map.set(action.id, Math.max(200 - index * 12, 0));
  });

  return map;
}

export function computePersonalMotivation(
  actionFamily: ActionFamily,
  profile: RecentActionProfile | null | undefined,
  domainFamily: DomainFamily,
  contextBin: string
): number {
  if (!profile || profile.click_total < MIN_CLICKS_FOR_PERSONAL) {
    return 0;
  }

  if (BLOCKED_PERSONAL_FAMILIES.has(actionFamily)) {
    return 0;
  }

  let score = 0;
  const clicks = profile.recent_clicks ?? [];

  for (const click of clicks) {
    if (click.action_family === actionFamily) {
      score += 8 * (click.weight ?? 1);
    }
    if (
      click.context_bin === contextBin &&
      click.action_family === actionFamily
    ) {
      score += 4 * (click.weight ?? 1);
    }
  }

  const affinity = profile.domain_affinity?.[domainFamily] ?? 0;
  if (
    affinity > 0 &&
    ["price_compare", "save_open", "review_decide"].includes(actionFamily)
  ) {
    score += 12 * affinity;
  }

  return Math.min(score, PERSONAL_MAX);
}

export function computeStateTransitionBoost(
  actionFamily: ActionFamily,
  linkState: LinkLifecycleRecord | null | undefined,
  domainFamily: DomainFamily,
  now = Date.now()
): number {
  if (!linkState || linkState.lifecycle_state === "done") {
    return 0;
  }

  const hoursSinceSave =
    (now - new Date(linkState.first_saved_at).getTime()) / (1000 * 60 * 60);
  const isRevisit =
    linkState.reopen_count >= 1 || hoursSinceSave >= REVISIT_HOURS_THRESHOLD;

  if (
    linkState.lifecycle_state === "saved" ||
    linkState.lifecycle_state === "opened"
  ) {
    if (isRevisit && (domainFamily === "commerce" || domainFamily === "secondhand")) {
      if (actionFamily === "price_compare") return STATE_MAX;
      if (actionFamily === "review_decide") return 18;
      if (actionFamily === "save_open") return 10;
    }

    if (isRevisit && domainFamily === "news") {
      if (actionFamily === "summary_read") return 25;
    }
  }

  if (linkState.lifecycle_state === "compared") {
    if (actionFamily === "review_decide") return 22;
    if (actionFamily === "save_open") return 15;
  }

  return 0;
}

type GuardrailInput = {
  ruleScore: number;
  personalRaw: number;
  stateRaw: number;
};

/**
 * Guardrails prevent personalization from overriding hard domain rules.
 *
 * Pseudo-code:
 *   cappedPersonal = min(personalRaw, PERSONAL_MAX, ruleScore * MAX_PERSONAL_SHARE_OF_RULE)
 *   cappedState    = min(stateRaw, STATE_MAX, ruleScore * MAX_COMBINED... - cappedPersonal)
 *   if topRuleAction beats challenger by < PRIMARY_SWAP_MARGIN: keep rule winner
 */
export function applyScoreGuardrails(input: GuardrailInput): {
  personal: number;
  state: number;
  applied: string[];
} {
  const applied: string[] = [];
  const ruleFloor = Math.max(input.ruleScore, 1);

  let personal = input.personalRaw;
  let state = input.stateRaw;

  const personalCap = ruleFloor * MAX_PERSONAL_SHARE_OF_RULE;
  if (personal > personalCap) {
    personal = personalCap;
    applied.push("personal_share_cap");
  }

  personal = Math.min(personal, PERSONAL_MAX);

  const combinedCap = ruleFloor * MAX_COMBINED_PERSONAL_STATE_SHARE;
  if (personal + state > combinedCap) {
    state = Math.max(0, combinedCap - personal);
    applied.push("combined_share_cap");
  }

  state = Math.min(state, STATE_MAX);

  return { personal, state, applied };
}

export function scoreActionWithPersonalization(input: {
  action: LinkActionItem;
  context: EnricherContext;
  sourceUrl: string;
  ruleScore: number;
  statMap: Map<string, ActionBinStat>;
  profile: RecentActionProfile | null | undefined;
  linkState: LinkLifecycleRecord | null | undefined;
  domainFamily: DomainFamily;
  contextBin: string;
}): PersonalizationScoreBreakdown {
  const actionFamily = toActionFamily(input.action);
  const rule = input.ruleScore;
  const intentBin = intentBinBoost(input.action, input.statMap);
  const abilityPenalty = scoreActionEffort(input.action);

  const personalRaw = computePersonalMotivation(
    actionFamily,
    input.profile,
    input.domainFamily,
    input.contextBin
  );
  const stateRaw = computeStateTransitionBoost(
    actionFamily,
    input.linkState,
    input.domainFamily
  );

  const guardrail = applyScoreGuardrails({
    ruleScore: Math.max(rule + intentBin, 1),
    personalRaw,
    stateRaw,
  });

  const total =
    rule + intentBin + guardrail.personal + guardrail.state - abilityPenalty;

  return {
    rule,
    intentBin,
    personal: guardrail.personal,
    state: guardrail.state,
    abilityPenalty,
    total,
    guardrailApplied: guardrail.applied,
  };
}

export function pickPersonalizedPrimaryAction(input: {
  actions: LinkActionItem[];
  context: EnricherContext;
  sourceUrl: string;
  stats?: ActionBinStat[];
  profile?: RecentActionProfile | null;
  linkState?: LinkLifecycleRecord | null;
  domainFamily: DomainFamily;
  contextBin: string;
  /** Session or user-tapped primary — hysteresis applies when swapping away. */
  incumbentActionId?: string | null;
}): LinkActionItem | null {
  const display = input.actions.filter((a) => a.kind !== "copy");
  if (display.length === 0) {
    return input.actions[0] ?? null;
  }

  const ruleRanked = rankActionsByContext(display, input.context, input.sourceUrl);
  const ruleScoreMap = buildRuleScoreMap(display, input.context, input.sourceUrl);
  const statMap = new Map((input.stats ?? []).map((s) => [s.action_key, s]));

  const scored = ruleRanked.map((action) => ({
    action,
    breakdown: scoreActionWithPersonalization({
      action,
      context: input.context,
      sourceUrl: input.sourceUrl,
      ruleScore: ruleScoreMap.get(action.id) ?? 0,
      statMap,
      profile: input.profile,
      linkState: input.linkState,
      domainFamily: input.domainFamily,
      contextBin: input.contextBin,
    }),
  }));

  scored.sort((a, b) => b.breakdown.total - a.breakdown.total);

  const ruleWinner = ruleRanked[0];
  const personalizedWinner = scored[0]?.action;

  if (!personalizedWinner) {
    return ruleWinner ?? null;
  }

  let candidate = personalizedWinner;

  if (ruleWinner && candidate.id !== ruleWinner.id) {
    const ruleScore =
      scored.find((entry) => entry.action.id === ruleWinner.id)?.breakdown.total ?? 0;
    const winnerScore = scored[0].breakdown.total;

    if (winnerScore - ruleScore < PRIMARY_SWAP_MARGIN) {
      candidate = ruleWinner;
    }
  }

  return resolvePrimaryWithHysteresis({
    scored: scored.map((entry) => ({
      action: entry.action,
      total: entry.breakdown.total,
    })),
    incumbentActionId: input.incumbentActionId,
    fallback: candidate,
  });
}
