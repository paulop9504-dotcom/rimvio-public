/** Secondary Action Generator — Event OS lifecycle helpers (AUX only). */

export type SecondaryActionReason = "next_step" | "risk" | "convenience";

export type SecondaryActionCategory =
  | "next_step_projection"
  | "risk_prevention"
  | "convenience_optimization";

export type EventContextInput = {
  title: string;
  location?: string | null;
  minutes_until_event?: number | null;
  intent?: string;
  category?: string;
  spawn_phase?: import("@/lib/action-spawn/types").ActionSpawnPhase;
};

export type MainActionInput = {
  id: string;
  label: string;
  action_type?: string;
  plugin?: string | null;
};

export type SecondaryActionCandidatePoolItem = {
  id: string;
  label: string;
  action_type?: string;
};

export type SecondaryActionGeneratorInput = {
  main_action: MainActionInput;
  event: EventContextInput;
  user_history?: {
    preferred_plugins?: readonly string[];
    dismissed_labels?: readonly string[];
  };
  candidate_pool?: readonly SecondaryActionCandidatePoolItem[];
};

export type SecondaryActionWire = {
  label: string;
  reason: SecondaryActionReason;
  plugin: string;
  confidence: number;
  /** Stable id for UI wiring */
  id: string;
  category: SecondaryActionCategory;
};

export const MAX_SECONDARY_ACTIONS = 3;

export const REASON_TO_CATEGORY: Record<
  SecondaryActionReason,
  SecondaryActionCategory
> = {
  next_step: "next_step_projection",
  risk: "risk_prevention",
  convenience: "convenience_optimization",
};
