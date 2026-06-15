import type {
  ActionOpportunityState,
  ConversationIntentDomain,
} from "@/lib/predictive-dock/action-opportunity-types";

export type ShadowActionState = "ACTIVE" | "WARM" | "ARCHIVED";

export type PredictiveActionType =
  | "NAVIGATE"
  | "CALL"
  | "INFO"
  | "TRANSIT"
  | "TAXI"
  | "ZOOM"
  | "PARKING"
  | "EXPENSE"
  | "NEXT"
  | "REST"
  | "SAVE"
  | "CHECK"
  | "LIST"
  | "SHARE"
  | "TICKET_QR"
  | "LINK";

export type PredictiveDockAction = {
  id: string;
  type: PredictiveActionType;
  label: string;
  icon: string;
  score: number;
  state: ShadowActionState;
  prompt: string;
  promote_when?: { minutes_before?: number };
  /** Canonical EventCandidate id (`ec-*`) for timeline actions. */
  anchorId?: string;
  templateId?: string | null;
  strategyApplied?: import("@/lib/action-registry/types").ActionStrategyTier;
  contextKey?: string;
  tripAction?: "packing" | "flight" | "taxi";
  /** Rimvio Action Opportunity lifecycle — scored after raw dock projection. */
  opportunityState?: ActionOpportunityState;
  /** Intent domain this opportunity belongs to — drives Rule 1 relevance. */
  intentDomain?: ConversationIntentDomain;
  /** Engine-assigned tier — UI must not recompute. */
  action_tier?: "MAIN" | "AUX";
  /** Plugin execution id when MAIN or optional AUX. */
  plugin?: string | null;
  /** Secondary generator reason. */
  secondary_reason?: "next_step" | "risk" | "convenience";
  /** Deterministic MAIN ranking hint (Korean). */
  rankingWhy?: string;
  /** Hook C — top ranked action after goal blend (UI badge optional). */
  goalAligned?: boolean;
  /** Hook C — scoreActionAlignment output for this row (telemetry / dev). */
  goal_alignment_score?: number;
};

export type PredictiveDockWire = {
  main_action: PredictiveDockAction | null;
  shadow_actions: PredictiveDockAction[];
};

export type ScheduleAnchor = {
  id: string;
  fireAt: string;
  placeName: string;
  task: string;
  phone?: string | null;
};
