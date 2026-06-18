/** Context Understanding wire — semantic input signal for Event Compiler only. */

export type EventTypeHint =
  | "work"
  | "travel"
  | "health"
  | "finance"
  | "social"
  | "lifestyle"
  | "unknown";

export type ImportanceSignal = "low" | "medium" | "high";

export type RiskOrAttentionSignal =
  | "urgency"
  | "preparation_needed"
  | "coordination_required"
  | "location_dependency";

export type ContextUnderstandingWire = {
  intent: string;
  entities: string[];
  event_type_hint: EventTypeHint;
  importance_signal: ImportanceSignal;
  context_understanding: string;
  possible_meanings: string[];
  risk_or_attention_signals: RiskOrAttentionSignal[];
};

export type ContextUnderstandingInput = {
  message?: string;
  /** Read-only system context from Rule Engine — LLM interprets, does not mutate. */
  system_context?: {
    calendar_events?: Array<{
      title?: string;
      location?: string | null;
      starts_at?: string | null;
      minutes_until?: number | null;
    }>;
    proximity?: "at_venue" | "en_route" | "unknown";
    time_bucket?: string;
  };
  clock?: Date;
};
