import type { PredictiveActionType } from "@/lib/predictive-dock/types";
import type { ActionDecisionCandidate } from "@/lib/action-decision/types";

const EXTERNAL_EXECUTION_TYPES = new Set<PredictiveActionType>([
  "TAXI",
  "TRANSIT",
  "CALL",
  "EXPENSE",
  "NAVIGATE",
  "PARKING",
  "ZOOM",
  "TICKET_QR",
]);

const READ_ONLY_TYPES = new Set<PredictiveActionType>([
  "INFO",
  "CHECK",
  "LIST",
  "LINK",
  "SAVE",
  "SHARE",
  "REST",
  "NEXT",
]);

const STATE_CHANGE_PATTERN =
  /(?:출발|결제|확정|호출|탑승|체크인|송금|예약\s*완료|등록|접수)/iu;

const PLUGIN_BY_TYPE: Partial<Record<PredictiveActionType, string>> = {
  TAXI: "kakao.taxi",
  TRANSIT: "kakao.taxi",
  NAVIGATE: "navigation",
  CALL: "tel",
  EXPENSE: "expense.record",
  PARKING: "parking.register",
  ZOOM: "zoom.join",
  TICKET_QR: "ticket.view",
};

const PLUGIN_BY_LABEL: Array<{ pattern: RegExp; plugin: string }> = [
  { pattern: /카카오\s*T|카카오T/u, plugin: "kakao.taxi" },
  { pattern: /택시/u, plugin: "kakao.taxi" },
  { pattern: /송금|이체/u, plugin: "bank.transfer" },
  { pattern: /결제/u, plugin: "payment.checkout" },
  { pattern: /길찾기|내비/u, plugin: "navigation" },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function isPredictiveActionType(value: string): value is PredictiveActionType {
  return (
    EXTERNAL_EXECUTION_TYPES.has(value as PredictiveActionType) ||
    READ_ONLY_TYPES.has(value as PredictiveActionType)
  );
}

export function resolveActionPlugin(candidate: ActionDecisionCandidate): string | null {
  if (candidate.plugin?.trim()) {
    return candidate.plugin.trim();
  }

  const actionType = candidate.action_type?.trim().toUpperCase();
  if (actionType && isPredictiveActionType(actionType)) {
    return PLUGIN_BY_TYPE[actionType] ?? null;
  }

  for (const entry of PLUGIN_BY_LABEL) {
    if (entry.pattern.test(candidate.label)) {
      return entry.plugin;
    }
  }

  return null;
}

export function inferTimeCriticality(
  candidate: ActionDecisionCandidate,
  minutesUntilEvent: number | null,
): number {
  if (typeof candidate.time_criticality === "number") {
    return clamp01(candidate.time_criticality);
  }

  if (minutesUntilEvent == null) {
    return 0.45;
  }

  if (minutesUntilEvent < 0) {
    return 0.15;
  }
  if (minutesUntilEvent <= 10) {
    return 0.95;
  }
  if (minutesUntilEvent <= 30) {
    return 0.85;
  }
  if (minutesUntilEvent <= 60) {
    return 0.75;
  }
  if (minutesUntilEvent <= 120) {
    return 0.65;
  }
  if (minutesUntilEvent <= 24 * 60) {
    return 0.5;
  }
  return 0.25;
}

export function inferStateChange(candidate: ActionDecisionCandidate): boolean {
  if (typeof candidate.state_change === "boolean") {
    return candidate.state_change;
  }

  const actionType = candidate.action_type?.trim().toUpperCase();
  if (actionType === "TAXI" || actionType === "TRANSIT" || actionType === "EXPENSE") {
    return true;
  }

  return STATE_CHANGE_PATTERN.test(candidate.label);
}

export function inferExternalExecution(candidate: ActionDecisionCandidate): boolean {
  if (typeof candidate.external_execution === "boolean") {
    return candidate.external_execution;
  }

  const plugin = resolveActionPlugin(candidate);
  if (plugin) {
    return true;
  }

  const actionType = candidate.action_type?.trim().toUpperCase();
  if (actionType && isPredictiveActionType(actionType)) {
    return EXTERNAL_EXECUTION_TYPES.has(actionType as PredictiveActionType);
  }

  return STATE_CHANGE_PATTERN.test(candidate.label);
}

export function inferUserHistoryWeight(candidate: ActionDecisionCandidate): number {
  if (typeof candidate.user_history_weight === "number") {
    return clamp01(candidate.user_history_weight);
  }
  return 0.5;
}

/** MAIN requires plugin execution trigger — read-only actions cannot be MAIN. */
export function canBeMainAction(candidate: ActionDecisionCandidate): boolean {
  const plugin = resolveActionPlugin(candidate);
  if (!plugin) {
    return false;
  }

  const actionType = candidate.action_type?.trim().toUpperCase();
  if (actionType && READ_ONLY_TYPES.has(actionType as PredictiveActionType)) {
    return false;
  }

  return inferExternalExecution(candidate);
}

export function classifyActionTier(input: {
  candidate: ActionDecisionCandidate;
  time_criticality: number;
  state_change: boolean;
}): "MAIN" | "AUX" {
  if (!canBeMainAction(input.candidate)) {
    return "AUX";
  }

  const timeCritical = input.time_criticality > 0.7;
  const stateImpact = input.state_change && input.time_criticality > 0.45;

  if (timeCritical || stateImpact) {
    return "MAIN";
  }

  return "AUX";
}
