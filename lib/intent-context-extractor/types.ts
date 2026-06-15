/** Intent + Context Extractor wire — semantic layer only (no UI/timing/execution). */

export type ContextType =
  | "work"
  | "travel"
  | "social"
  | "health"
  | "finance"
  | "lifestyle"
  | "unknown";

export type TimeSensitivity = "low" | "medium" | "high";

export type LocationRelevance = "none" | "indirect" | "direct";

export type ActionCategoryHint = "main" | "auxiliary";

export type SecondaryReasonSignal =
  | "efficiency"
  | "urgency"
  | "preparation"
  | "risk_prevention"
  | "convenience";

export type PossibleActionCandidate = {
  action: string;
  category: ActionCategoryHint;
  reason: string;
};

export type IntentContextWire = {
  intent: string;
  context: {
    type: ContextType;
    entities: string[];
    time_sensitivity: TimeSensitivity;
    location_relevance: LocationRelevance;
  };
  possible_actions: PossibleActionCandidate[];
  secondary_reason_signals: SecondaryReasonSignal[];
};

export type IntentContextExtractInput = {
  message?: string;
  event?: {
    title?: string;
    location?: string | null;
    starts_at?: string | null;
    minutes_until?: number | null;
  };
  clock?: Date;
  signals?: {
    unread_team_feedback_count?: number;
    upcoming_meeting_count?: number;
    proximity?: "at_venue" | "en_route" | "unknown";
  };
};
