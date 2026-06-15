import type { PredictiveDockAction } from "@/lib/predictive-dock/types";
import type { ActionDecisionCandidate, MainAuxSplitOutput } from "@/lib/action-decision/types";
import { splitMainAuxActions } from "@/lib/action-decision/split-main-aux-actions";

export function predictiveDockActionToCandidate(
  action: PredictiveDockAction,
): ActionDecisionCandidate {
  return {
    id: action.id,
    label: action.label,
    action_type: action.type,
    user_history_weight: clampBehaviorScore(action.score),
  };
}

function clampBehaviorScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0.5;
  }
  if (score > 1) {
    return Math.min(1, score / 100);
  }
  return Math.max(0, Math.min(1, score));
}

/** Bridge predictive dock wire → MAIN/AUX activation signal. */
export function splitPredictiveDockActions(input: {
  actions: readonly PredictiveDockAction[];
  minutes_until_event?: number | null;
}): MainAuxSplitOutput {
  return splitMainAuxActions({
    candidates: input.actions.map(predictiveDockActionToCandidate),
    minutes_until_event: input.minutes_until_event,
  });
}
