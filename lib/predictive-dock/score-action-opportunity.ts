import {
  OPPORTUNITY_SCORE_WEIGHTS,
  OPPORTUNITY_TYPES_BY_INTENT,
  OPPORTUNITY_VISIBLE_MIN_SCORE,
  type ActionOpportunityScoreBreakdown,
  type ActionOpportunityState,
  type ConversationIntentDomain,
} from "@/lib/predictive-dock/action-opportunity-types";
import type { PredictiveDockAction } from "@/lib/predictive-dock/types";
import type { CanonicalContainerKey } from "@/lib/containers/container-types";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function intentMatchScore(
  action: PredictiveDockAction,
  intent: ConversationIntentDomain
): number {
  const allowed = OPPORTUNITY_TYPES_BY_INTENT[intent];
  if (!allowed.includes(action.type)) {
    return 0;
  }
  if (action.intentDomain && action.intentDomain !== intent) {
    return 0.15;
  }
  if (action.intentDomain === intent) {
    return 1;
  }
  return 0.72;
}

function temporalMatchScore(
  action: PredictiveDockAction,
  minutesUntilAnchor: number | null
): number {
  if (minutesUntilAnchor == null) {
    return action.state === "ACTIVE" ? 0.55 : 0.45;
  }

  if (minutesUntilAnchor < -45) {
    return 0;
  }

  if (minutesUntilAnchor <= 5) {
    return action.type === "NAVIGATE" ? 1 : 0.35;
  }

  if (minutesUntilAnchor <= 20) {
    return action.type === "NAVIGATE" || action.type === "CALL" ? 0.85 : 0.5;
  }

  if (minutesUntilAnchor <= 60) {
    return action.type === "NAVIGATE" || action.type === "TRANSIT" ? 0.7 : 0.55;
  }

  return action.type === "INFO" || action.type === "CALL" ? 0.6 : 0.4;
}

function containerMatchScore(
  action: PredictiveDockAction,
  intent: ConversationIntentDomain,
  activeChains: readonly CanonicalContainerKey[]
): number {
  if (intent === "travel") {
    return activeChains.includes("transport_guard") ? 1 : 0.25;
  }
  if (intent === "dining_discovery") {
    return 0.55;
  }
  if (intent === "schedule") {
    return activeChains.includes("calendar_planner") ? 0.9 : 0.5;
  }
  if (action.tripAction) {
    return activeChains.includes("transport_guard") ? 0.8 : 0.1;
  }
  return 0.5;
}

function behaviorMatchScore(action: PredictiveDockAction): number {
  const normalized = Math.min(99, Math.max(0, action.score)) / 99;
  return clamp01(normalized);
}

export function scoreActionOpportunity(input: {
  action: PredictiveDockAction;
  intent: ConversationIntentDomain;
  activeChains?: readonly CanonicalContainerKey[];
  minutesUntilAnchor?: number | null;
}): ActionOpportunityScoreBreakdown {
  const intentMatch = intentMatchScore(input.action, input.intent);
  const temporalMatch = temporalMatchScore(
    input.action,
    input.minutesUntilAnchor ?? null
  );
  const containerMatch = containerMatchScore(
    input.action,
    input.intent,
    input.activeChains ?? []
  );
  const behaviorMatch = behaviorMatchScore(input.action);

  const composite =
    intentMatch * OPPORTUNITY_SCORE_WEIGHTS.intentMatch +
    temporalMatch * OPPORTUNITY_SCORE_WEIGHTS.temporalMatch +
    containerMatch * OPPORTUNITY_SCORE_WEIGHTS.containerMatch +
    behaviorMatch * OPPORTUNITY_SCORE_WEIGHTS.behaviorMatch;

  return {
    intentMatch,
    temporalMatch,
    containerMatch,
    behaviorMatch,
    composite: clamp01(composite),
  };
}

export function resolveOpportunityState(input: {
  action: PredictiveDockAction;
  breakdown: ActionOpportunityScoreBreakdown;
  minutesUntilAnchor: number | null;
  consumed: boolean;
}): ActionOpportunityState {
  if (input.consumed) {
    return "EXPIRED";
  }

  if (input.minutesUntilAnchor != null && input.minutesUntilAnchor < -45) {
    return "EXPIRED";
  }

  if (input.breakdown.intentMatch <= 0) {
    return "HIDDEN";
  }

  if (input.breakdown.composite < OPPORTUNITY_VISIBLE_MIN_SCORE) {
    return "HIDDEN";
  }

  if (
    input.action.state === "ACTIVE" ||
    (input.breakdown.composite >= 0.78 && input.breakdown.temporalMatch >= 0.8)
  ) {
    return "ACTIVE";
  }

  return "WARM";
}
