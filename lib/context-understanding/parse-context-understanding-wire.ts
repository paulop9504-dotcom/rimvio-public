import type {
  ContextUnderstandingWire,
  EventTypeHint,
  ImportanceSignal,
  RiskOrAttentionSignal,
} from "@/lib/context-understanding/types";

const EVENT_TYPES: EventTypeHint[] = [
  "work",
  "travel",
  "health",
  "finance",
  "social",
  "lifestyle",
  "unknown",
];

const IMPORTANCE: ImportanceSignal[] = ["low", "medium", "high"];

const RISK_SIGNALS: RiskOrAttentionSignal[] = [
  "urgency",
  "preparation_needed",
  "coordination_required",
  "location_dependency",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}

export function parseContextUnderstandingWire(raw: unknown): ContextUnderstandingWire | null {
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

  const eventTypeRaw = asString(parsed.event_type_hint);
  const importanceRaw = asString(parsed.importance_signal);

  return {
    intent: asString(parsed.intent) || "unknown_intent",
    entities: asStringList(parsed.entities),
    event_type_hint: EVENT_TYPES.includes(eventTypeRaw as EventTypeHint)
      ? (eventTypeRaw as EventTypeHint)
      : "unknown",
    importance_signal: IMPORTANCE.includes(importanceRaw as ImportanceSignal)
      ? (importanceRaw as ImportanceSignal)
      : "low",
    context_understanding: asString(parsed.context_understanding),
    possible_meanings: asStringList(parsed.possible_meanings, 6),
    risk_or_attention_signals: asStringList(parsed.risk_or_attention_signals, 6).filter(
      (item): item is RiskOrAttentionSignal =>
        RISK_SIGNALS.includes(item as RiskOrAttentionSignal),
    ),
  };
}

export function validateContextUnderstandingWire(wire: ContextUnderstandingWire): string[] {
  const failures: string[] = [];
  if (!wire.intent.trim()) {
    failures.push("intent_empty");
  }
  return failures;
}
