/** MAIN vs AUX — engine-only action tier (UI never decides). */

export type ActionTier = "MAIN" | "AUX";

export type ActionDecisionCandidate = {
  id: string;
  label: string;
  /** Predictive dock / registry action type when known. */
  action_type?: string;
  /** Plugin id for external execution — required for MAIN. */
  plugin?: string | null;
  /** Optional explicit overrides (0–1). */
  time_criticality?: number;
  state_change?: boolean;
  external_execution?: boolean;
  user_history_weight?: number;
  /** Minutes until anchored event; drives time criticality when unset. */
  minutes_until_event?: number | null;
};

export type ActionDecisionScores = {
  time_criticality: number;
  state_change_weight: number;
  external_execution_weight: number;
  user_history_weight: number;
  /** Archive rollup boost applied in composite (prep surface / dock). */
  rollup_score_delta: number;
  composite_score: number;
};

export type ScoredActionDecision = ActionDecisionCandidate &
  ActionDecisionScores & {
    tier: ActionTier;
    can_be_main: boolean;
  };

export type MainActionWire = {
  label: string;
  plugin: string | null;
  type: "MAIN";
  action_id: string;
  score: number;
};

export type AuxActionWire = {
  label: string;
  type: "AUX";
  action_id: string;
  score: number;
  plugin?: string | null;
};

/** Canonical MAIN/AUX split — activation signal for UI spawn. */
export type MainAuxSplitOutput = {
  primary_action: MainActionWire | null;
  secondary_actions: AuxActionWire[];
};

export const ACTION_DECISION_WEIGHTS = {
  time_criticality: 0.4,
  state_change: 0.3,
  external_execution: 0.2,
  user_history: 0.1,
} as const;

/** Prep-surface only — archive rollup scoreDelta boost for MAIN ranking. */
export const ROLLUP_SCORE_WEIGHT = 0.35;

export const MAIN_TIME_CRITICALITY_THRESHOLD = 0.7;
export const MAX_AUX_ACTIONS = 3;
