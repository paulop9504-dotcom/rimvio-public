import { resolveRollupUserHistoryWeight, resolveRollupScoreDelta } from "@/lib/action-decision/resolve-rollup-history-weight";
import {
  canBeMainAction,
  classifyActionTier,
  inferExternalExecution,
  inferStateChange,
  inferTimeCriticality,
  inferUserHistoryWeight,
  resolveActionPlugin,
} from "@/lib/action-decision/infer-action-signals";
import { buildDockRankingWhyFromScored } from "@/lib/action-decision/build-dock-ranking-explain";
import {
  ACTION_DECISION_WEIGHTS,
  MAX_AUX_ACTIONS,
  ROLLUP_SCORE_WEIGHT,
  type ActionDecisionCandidate,
  type MainAuxSplitOutput,
  type ScoredActionDecision,
} from "@/lib/action-decision/types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

export function scoreActionDecision(input: {
  candidate: ActionDecisionCandidate;
  minutes_until_event?: number | null;
  ranking_context_key?: string;
}): ScoredActionDecision {
  const minutesUntil =
    input.minutes_until_event ?? input.candidate.minutes_until_event ?? null;

  const time_criticality = inferTimeCriticality(input.candidate, minutesUntil);
  const state_change = inferStateChange(input.candidate);
  const state_change_weight = state_change ? 1 : 0;
  const external_execution_weight = inferExternalExecution(input.candidate) ? 1 : 0;
  const rollupWeight = resolveRollupUserHistoryWeight({
    contextKey: input.ranking_context_key,
    actionId: input.candidate.id,
    label: input.candidate.label,
  });
  const user_history_weight = clamp01(
    inferUserHistoryWeight(input.candidate) * 0.4 + rollupWeight * 0.6,
  );
  const rollup_score_delta = resolveRollupScoreDelta({
    contextKey: input.ranking_context_key,
    actionId: input.candidate.id,
    label: input.candidate.label,
  });

  const composite_score = clamp01(
    time_criticality * ACTION_DECISION_WEIGHTS.time_criticality +
      state_change_weight * ACTION_DECISION_WEIGHTS.state_change +
      external_execution_weight * ACTION_DECISION_WEIGHTS.external_execution +
      user_history_weight * ACTION_DECISION_WEIGHTS.user_history +
      rollup_score_delta * ROLLUP_SCORE_WEIGHT,
  );

  const tier = classifyActionTier({
    candidate: input.candidate,
    time_criticality,
    state_change,
  });

  return {
    ...input.candidate,
    time_criticality,
    state_change_weight,
    external_execution_weight,
    user_history_weight,
    rollup_score_delta,
    composite_score,
    tier,
    can_be_main: canBeMainAction(input.candidate),
  };
}

export type MainAuxSplitWithExplain = MainAuxSplitOutput & {
  primary_why_line: string | null;
};

/** MAIN/AUX split + one-line Korean explain for dock UI. */
export function splitMainAuxActionsWithExplain(input: {
  candidates: readonly ActionDecisionCandidate[];
  minutes_until_event?: number | null;
  ranking_context_key?: string;
}): MainAuxSplitWithExplain {
  const scored = input.candidates.map((candidate) =>
    scoreActionDecision({
      candidate,
      minutes_until_event: input.minutes_until_event,
      ranking_context_key: input.ranking_context_key,
    }),
  );
  const split = splitMainAuxActions(input);
  const primaryScored = split.primary_action
    ? scored.find((entry) => entry.id === split.primary_action!.action_id)
    : null;

  return {
    ...split,
    primary_why_line: primaryScored
      ? buildDockRankingWhyFromScored(primaryScored)
      : null,
  };
}

/**
 * Event → Candidate Actions → Ranking → MAIN/AUX Split → UI spawn signal.
 * UI must not re-rank — only render this output.
 */
export function splitMainAuxActions(input: {
  candidates: readonly ActionDecisionCandidate[];
  minutes_until_event?: number | null;
  ranking_context_key?: string;
}): MainAuxSplitOutput {
  const scored = input.candidates
    .map((candidate) =>
      scoreActionDecision({
        candidate,
        minutes_until_event: input.minutes_until_event,
        ranking_context_key: input.ranking_context_key,
      }),
    )
    .sort((left, right) => right.composite_score - left.composite_score);

  const mainCandidates = scored.filter((entry) => entry.tier === "MAIN");
  const primary = mainCandidates[0] ?? null;

  const secondary = scored
    .filter((entry) => entry.id !== primary?.id)
    .slice(0, MAX_AUX_ACTIONS);

  return {
    primary_action: primary
      ? {
          label: primary.label,
          plugin: resolveActionPlugin(primary),
          type: "MAIN",
          action_id: primary.id,
          score: primary.composite_score,
        }
      : null,
    secondary_actions: secondary.map((entry) => ({
      label: entry.label,
      type: "AUX" as const,
      action_id: entry.id,
      score: entry.composite_score,
      plugin: resolveActionPlugin(entry),
    })),
  };
}

export function scoreAllActionDecisions(input: {
  candidates: readonly ActionDecisionCandidate[];
  minutes_until_event?: number | null;
  ranking_context_key?: string;
}): ScoredActionDecision[] {
  return input.candidates
    .map((candidate) =>
      scoreActionDecision({
        candidate,
        minutes_until_event: input.minutes_until_event,
        ranking_context_key: input.ranking_context_key,
      }),
    )
    .sort((left, right) => right.composite_score - left.composite_score);
}
