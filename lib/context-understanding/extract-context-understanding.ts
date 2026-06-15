import type {
  ContextUnderstandingInput,
  ContextUnderstandingWire,
  EventTypeHint,
  ImportanceSignal,
  RiskOrAttentionSignal,
} from "@/lib/context-understanding/types";

function uniquePush<T>(list: T[], value: T) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function combinedText(input: ContextUnderstandingInput): string {
  const parts = [input.message?.trim() ?? ""];
  for (const event of input.system_context?.calendar_events ?? []) {
    if (event.title?.trim()) {
      parts.push(event.title.trim());
    }
    if (event.location?.trim()) {
      parts.push(event.location.trim());
    }
  }
  return parts.filter(Boolean).join(" · ");
}

function inferEventType(text: string): EventTypeHint {
  if (/(?:미팅|회의|meeting|파트너|업무|프로젝트|발표)/iu.test(text)) {
    return "work";
  }
  if (/(?:이동|출발|역|공항|택시|내비|도착)/iu.test(text)) {
    return "travel";
  }
  if (/(?:헬스|PT|운동|병원|치과)/iu.test(text)) {
    return "health";
  }
  if (/(?:송금|결제|카드|주식|환율)/u.test(text)) {
    return "finance";
  }
  if (/(?:친구|약속|만나|연락)/u.test(text)) {
    return "social";
  }
  if (/(?:먹|식사|쇼핑|주문)/u.test(text)) {
    return "lifestyle";
  }
  return "unknown";
}

function inferImportance(input: ContextUnderstandingInput, text: string): ImportanceSignal {
  if (/(?:중요|필수|꼭|급|준비)/u.test(text)) {
    return "high";
  }

  const minutesList =
    input.system_context?.calendar_events
      ?.map((event) => event.minutes_until)
      .filter((value): value is number => value != null) ?? [];

  if (minutesList.some((m) => m <= 60)) {
    return "high";
  }
  if (minutesList.some((m) => m <= 180)) {
    return "medium";
  }
  if (/(?:미팅|회의|meeting|병원|공항)/iu.test(text)) {
    return "medium";
  }
  return "low";
}

function extractEntities(input: ContextUnderstandingInput, text: string): string[] {
  const entities: string[] = [];

  for (const event of input.system_context?.calendar_events ?? []) {
    if (event.title?.trim()) {
      uniquePush(entities, event.title.trim());
    }
    if (event.location?.trim()) {
      uniquePush(entities, event.location.trim());
    }
  }

  const placeMatch = text.match(/(?:강남역|[^\s]{2,10}(?:역|미팅|회의))/gu);
  for (const match of placeMatch ?? []) {
    uniquePush(entities, match.trim());
  }

  if (entities.length === 0 && input.message?.trim()) {
    uniquePush(entities, input.message.trim().slice(0, 48));
  }

  return entities.slice(0, 8);
}

function buildPossibleMeanings(text: string, eventType: EventTypeHint): string[] {
  const meanings: string[] = [];

  if (eventType === "work" || /(?:미팅|회의|meeting)/iu.test(text)) {
    meanings.push("documents may be needed");
    meanings.push("travel may be required");
    meanings.push("coordination with others likely");
  }

  if (/(?:준비|prep)/iu.test(text)) {
    meanings.push("advance preparation is implied");
  }

  if (/(?:강남|역|공항)/u.test(text)) {
    meanings.push("location-specific logistics may apply");
  }

  if (eventType === "health") {
    meanings.push("entry credentials or meal timing may matter");
  }

  return meanings.slice(0, 5);
}

function buildRiskSignals(
  input: ContextUnderstandingInput,
  text: string,
): RiskOrAttentionSignal[] {
  const signals: RiskOrAttentionSignal[] = [];

  if (/(?:준비|prep|서류|자료)/iu.test(text)) {
    uniquePush(signals, "preparation_needed");
  }

  if (/(?:미팅|회의|팀|파트너|협업)/iu.test(text)) {
    uniquePush(signals, "coordination_required");
  }

  if (
    input.system_context?.proximity === "en_route" ||
    /(?:강남|역|이동|출발|도착)/u.test(text)
  ) {
    uniquePush(signals, "location_dependency");
  }

  const urgentMinutes =
    input.system_context?.calendar_events?.some(
      (event) => event.minutes_until != null && event.minutes_until <= 45,
    ) ?? false;

  if (urgentMinutes || /(?:급|곧|바로|지금)/u.test(text)) {
    uniquePush(signals, "urgency");
  }

  return signals;
}

function inferIntent(text: string, eventType: EventTypeHint): string {
  if (/(?:준비|prep)/iu.test(text) && eventType === "work") {
    return "meeting preparation";
  }
  if (eventType === "work") {
    return "work event awareness";
  }
  if (eventType === "travel") {
    return "travel logistics";
  }
  if (eventType === "health") {
    return "health session preparation";
  }
  if (inputMessageLooksLikeDayStart(text)) {
    return "day start orientation";
  }
  return "general context clarification";
}

function inputMessageLooksLikeDayStart(text: string): boolean {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 11 && /(?:출근|하루|오늘|아침)/u.test(text);
}

function buildContextSummary(text: string, eventType: EventTypeHint): string {
  if (eventType === "work" && /(?:미팅|회의|meeting)/iu.test(text)) {
    return "business meeting requiring preparation";
  }
  if (eventType === "travel") {
    return "movement between places may be relevant";
  }
  if (eventType === "health") {
    return "scheduled health activity with prep implications";
  }
  if (text.trim()) {
    return `user expressed relevance around: ${text.slice(0, 80)}`;
  }
  return "limited semantic signal from input";
}

/**
 * Deterministic fallback — semantic interpretation only, no timing/UI/actions.
 */
export function extractContextUnderstanding(
  input: ContextUnderstandingInput,
): ContextUnderstandingWire {
  const text = combinedText(input);
  const eventType = inferEventType(text);
  const entities = extractEntities(input, text);

  return {
    intent: inferIntent(text, eventType),
    entities,
    event_type_hint: eventType,
    importance_signal: inferImportance(input, text),
    context_understanding: buildContextSummary(text, eventType),
    possible_meanings: buildPossibleMeanings(text, eventType),
    risk_or_attention_signals: buildRiskSignals(input, text),
  };
}
