export type {
  ActionDecisionCandidate,
  ActionDecisionScores,
  ActionTier,
  AuxActionWire,
  MainActionWire,
  MainAuxSplitOutput,
  ScoredActionDecision,
} from "@/lib/action-decision/types";

export {
  ACTION_DECISION_WEIGHTS,
  MAIN_TIME_CRITICALITY_THRESHOLD,
  MAX_AUX_ACTIONS,
} from "@/lib/action-decision/types";

export {
  canBeMainAction,
  classifyActionTier,
  inferExternalExecution,
  inferStateChange,
  inferTimeCriticality,
  inferUserHistoryWeight,
  resolveActionPlugin,
} from "@/lib/action-decision/infer-action-signals";

export {
  scoreActionDecision,
  scoreAllActionDecisions,
  splitMainAuxActions,
  splitMainAuxActionsWithExplain,
} from "@/lib/action-decision/split-main-aux-actions";

export {
  predictiveDockActionToCandidate,
  splitPredictiveDockActions,
} from "@/lib/action-decision/adapt-predictive-dock";

export {
  applyMainAuxToDockWire,
  flattenDockWire,
} from "@/lib/action-decision/apply-tier-to-dock-wire";

export {
  applyMainAuxToOverlayActions,
  overlayActionToCandidate,
} from "@/lib/action-decision/apply-tier-to-overlay";

export {
  buildTieredEventOverlayActions,
  enrichCalendarRowWithTieredActions,
} from "@/lib/action-decision/build-tiered-event-overlay-actions";
