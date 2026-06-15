export type IntentSlotName =
  | "time"
  | "place_name"
  | "branch"
  | "origin"
  | "destination"
  | "contact"
  | "date";

export type IntentKind =
  | "reserve"
  | "navigate"
  | "search_place"
  | "schedule"
  | "unknown";

export type IntentSlotAnalysis = {
  intent: IntentKind;
  intent_label: string;
  missing_slots: IntentSlotName[];
  found_slots: Partial<Record<IntentSlotName, string>>;
  confidence: number;
};
