import type {
  ActionCategoryHint,
  ContextType,
  IntentContextWire,
  LocationRelevance,
  PossibleActionCandidate,
  SecondaryReasonSignal,
  TimeSensitivity,
} from "@/lib/intent-context-extractor/types";

const CONTEXT_TYPES: ContextType[] = [
  "work",
  "travel",
  "social",
  "health",
  "finance",
  "lifestyle",
  "unknown",
];

const TIME_SENSITIVITY: TimeSensitivity[] = ["low", "medium", "high"];

const LOCATION_RELEVANCE: LocationRelevance[] = ["none", "indirect", "direct"];

const ACTION_CATEGORIES: ActionCategoryHint[] = ["main", "auxiliary"];

const SECONDARY_SIGNALS: SecondaryReasonSignal[] = [
  "efficiency",
  "urgency",
  "preparation",
  "risk_prevention",
  "convenience",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asContextType(value: unknown): ContextType {
  const raw = asString(value);
  return CONTEXT_TYPES.includes(raw as ContextType) ? (raw as ContextType) : "unknown";
}

function asTimeSensitivity(value: unknown): TimeSensitivity {
  const raw = asString(value);
  return TIME_SENSITIVITY.includes(raw as TimeSensitivity)
    ? (raw as TimeSensitivity)
    : "low";
}

function asLocationRelevance(value: unknown): LocationRelevance {
  const raw = asString(value);
  return LOCATION_RELEVANCE.includes(raw as LocationRelevance)
    ? (raw as LocationRelevance)
    : "none";
}

function asActionCategory(value: unknown): ActionCategoryHint {
  const raw = asString(value);
  return ACTION_CATEGORIES.includes(raw as ActionCategoryHint)
    ? (raw as ActionCategoryHint)
    : "auxiliary";
}

function asSecondarySignals(value: unknown): SecondaryReasonSignal[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is SecondaryReasonSignal =>
      typeof item === "string" &&
      SECONDARY_SIGNALS.includes(item as SecondaryReasonSignal),
  );
}

function asEntities(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
}

function asPossibleActions(value: unknown): PossibleActionCandidate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const out: PossibleActionCandidate[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const action = asString(item.action);
    if (!action) {
      continue;
    }
    out.push({
      action,
      category: asActionCategory(item.category),
      reason: asString(item.reason) || "contextually relevant",
    });
  }
  return out.slice(0, 12);
}

/** Parse and normalize strict JSON wire from LLM or API body. */
export function parseIntentContextWire(raw: unknown): IntentContextWire | null {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const contextRaw = isRecord(parsed.context) ? parsed.context : {};

  return {
    intent: asString(parsed.intent) || "unknown_intent",
    context: {
      type: asContextType(contextRaw.type),
      entities: asEntities(contextRaw.entities),
      time_sensitivity: asTimeSensitivity(contextRaw.time_sensitivity),
      location_relevance: asLocationRelevance(contextRaw.location_relevance),
    },
    possible_actions: asPossibleActions(parsed.possible_actions),
    secondary_reason_signals: asSecondarySignals(parsed.secondary_reason_signals),
  };
}

export function validateIntentContextWire(wire: IntentContextWire): string[] {
  const failures: string[] = [];

  if (!wire.intent.trim()) {
    failures.push("intent_empty");
  }

  if (wire.possible_actions.some((item) => !item.action.trim())) {
    failures.push("action_label_empty");
  }

  return failures;
}
