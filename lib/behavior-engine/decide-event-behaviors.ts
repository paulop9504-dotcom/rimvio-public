import type { EventOpportunitySignal } from "@/lib/opportunity-engine/types";
import {
  escalateHighlight,
  isBorderlineOpportunity,
  isContextIrrelevant,
  isImminentFromReason,
  isValidBehaviorEcId,
  isWithinTwoHoursFromReason,
  type BehaviorEngineContext,
  type BehaviorEngineResult,
  type BehaviorHighlightLevel,
  type EventBehaviorPolicy,
} from "@/lib/behavior-engine/types";

function applyPriorityRules(
  opportunity: EventOpportunitySignal,
  imminent: boolean
): EventBehaviorPolicy {
  const { ecId, priority } = opportunity;

  if (priority === "HIGH" && imminent) {
    return {
      ecId,
      show_in_dock: true,
      highlight: "HIGH",
      auto_nudge: true,
      notification: true,
      suppress: false,
    };
  }

  if (priority === "HIGH") {
    return {
      ecId,
      show_in_dock: true,
      highlight: "HIGH",
      auto_nudge: false,
      notification: false,
      suppress: false,
    };
  }

  if (priority === "MEDIUM") {
    return {
      ecId,
      show_in_dock: true,
      highlight: "MEDIUM",
      auto_nudge: false,
      notification: false,
      suppress: false,
    };
  }

  return {
    ecId,
    show_in_dock: true,
    highlight: "LOW",
    auto_nudge: false,
    notification: false,
    suppress: false,
  };
}

function applyTimeSensitivity(
  policy: EventBehaviorPolicy,
  reason: string
): EventBehaviorPolicy {
  if (!isWithinTwoHoursFromReason(reason)) {
    return policy;
  }
  return {
    ...policy,
    highlight: "HIGH",
    auto_nudge: true,
    notification: policy.notification || isImminentFromReason(reason),
  };
}

function applyDockFocus(
  policy: EventBehaviorPolicy,
  opportunity: EventOpportunitySignal,
  context: BehaviorEngineContext
): EventBehaviorPolicy {
  const focused = context.focusedEcId?.trim();
  if (!focused || focused !== policy.ecId) {
    return policy;
  }

  const withinTwoHours = isWithinTwoHoursFromReason(opportunity.reason);
  return {
    ...policy,
    highlight: escalateHighlight(policy.highlight),
    auto_nudge: policy.auto_nudge || withinTwoHours,
  };
}

function applySuppressRules(
  policy: EventBehaviorPolicy,
  opportunity: EventOpportunitySignal,
  context: BehaviorEngineContext
): EventBehaviorPolicy {
  const borderline = isBorderlineOpportunity(opportunity.score, opportunity.priority);
  const irrelevant = isContextIrrelevant(opportunity.ecId, opportunity.priority, context);

  if (!borderline && !irrelevant) {
    return policy;
  }

  return {
    ...policy,
    show_in_dock: false,
    highlight: "NONE",
    auto_nudge: false,
    notification: false,
    suppress: true,
  };
}

/** Decide behavior for one ranked opportunity — pure policy, no scoring. */
export function decideBehaviorForOpportunity(
  opportunity: EventOpportunitySignal,
  context: BehaviorEngineContext = {}
): EventBehaviorPolicy | null {
  if (!isValidBehaviorEcId(opportunity.ecId)) {
    return null;
  }

  const imminent = isImminentFromReason(opportunity.reason);

  let policy = applyPriorityRules(opportunity, imminent);
  policy = applyTimeSensitivity(policy, opportunity.reason);
  policy = applyDockFocus(policy, opportunity, context);
  policy = applySuppressRules(policy, opportunity, context);

  return policy;
}

function stableSortPolicies(policies: EventBehaviorPolicy[]): EventBehaviorPolicy[] {
  return [...policies].sort((left, right) => left.ecId.localeCompare(right.ecId));
}

function policiesEqual(
  left: EventBehaviorPolicy[],
  right: EventBehaviorPolicy[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const a = stableSortPolicies(left);
  const b = stableSortPolicies(right);
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Convert ranked opportunities into UI/system behavior policies.
 * Preserves Opportunity Engine ordering — does not re-rank.
 */
export function decideEventBehaviors(
  opportunities: readonly EventOpportunitySignal[],
  context: BehaviorEngineContext = {}
): BehaviorEngineResult {
  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    return "NO_ACTION";
  }

  const pass = (items: readonly EventOpportunitySignal[]) =>
    items
      .map((item) => decideBehaviorForOpportunity(item, context))
      .filter((item): item is EventBehaviorPolicy => item != null);

  const passA = pass(opportunities);
  const passB = pass(opportunities);

  if (passA.length === 0) {
    return "NO_ACTION";
  }

  if (!policiesEqual(passA, passB)) {
    return "NO_ACTION";
  }

  return passA;
}

export type { BehaviorEngineContext, BehaviorEngineResult, EventBehaviorPolicy };
