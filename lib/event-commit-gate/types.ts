export type EventIntentKind =
  | "travel"
  | "work"
  | "schedule"
  | "navigate"
  | "meal"
  | "unknown";

export type CommitSlotName =
  | "location"
  | "datetime"
  | "place"
  | "target"
  | "recipient";

export type CommitGateDecision = "DIRECT_ACTION" | "CLARIFY";

export type ClarifyMode = "schedule_confirm" | "slot_collect";

export type ParsedEventIntent = {
  intent: EventIntentKind;
  title: string;
  filled_slots: Partial<Record<CommitSlotName, string>>;
  missing_slots: CommitSlotName[];
  /** Highest-priority missing slot for single-turn clarify */
  primary_missing: CommitSlotName | null;
  clarify_mode: ClarifyMode | null;
  confidence: number;
  time_expression: string | null;
  schedule_note: string | null;
};

export type EventCommitGateResult = {
  decision: CommitGateDecision;
  intent: ParsedEventIntent;
};
