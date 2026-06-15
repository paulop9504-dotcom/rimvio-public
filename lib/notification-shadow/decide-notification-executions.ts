import type { EventBehaviorPolicy } from "@/lib/behavior-engine/types";
import {
  DEFAULT_NOTIFICATION_COOLDOWN_MS,
  isValidNotificationEcId,
  suppressReasonDefault,
  wasNotifiedWithinCooldown,
  type NotificationExecutionDecision,
  type NotificationShadowContext,
  type NotificationShadowResult,
  type NotificationTiming,
} from "@/lib/notification-shadow/types";

function suppressedDecision(ecId: string, reason: string): NotificationExecutionDecision {
  return {
    ecId,
    send_notification: false,
    timing: "batch",
    should_block_duplicate: false,
    suppress_final: true,
    reason,
  };
}

function executionFromBehavior(
  policy: EventBehaviorPolicy,
  context: NotificationShadowContext
): NotificationExecutionDecision {
  const { ecId } = policy;

  if (policy.suppress) {
    return suppressedDecision(ecId, "behavior suppress");
  }

  if (!policy.notification) {
    return suppressedDecision(ecId, "behavior notification disabled");
  }

  const dockFocused = context.dockFocusedEcId?.trim();
  if (dockFocused && dockFocused === ecId) {
    return suppressedDecision(ecId, "user engaged in dock");
  }

  if (wasNotifiedWithinCooldown(ecId, context)) {
    return {
      ecId,
      send_notification: false,
      timing: "batch",
      should_block_duplicate: true,
      suppress_final: true,
      reason: "duplicate within cooldown",
    };
  }

  const recentInteraction = (context.recentInteractionEcIds ?? []).includes(ecId);
  if (recentInteraction) {
    return {
      ecId,
      send_notification: true,
      timing: "delayed",
      should_block_duplicate: false,
      suppress_final: false,
      reason: "recent interaction — delayed",
    };
  }

  if (policy.auto_nudge && policy.highlight === "HIGH") {
    return {
      ecId,
      send_notification: true,
      timing: "immediate",
      should_block_duplicate: false,
      suppress_final: false,
      reason: "high priority nudge",
    };
  }

  if (policy.highlight === "MEDIUM") {
    return {
      ecId,
      send_notification: true,
      timing: "delayed",
      should_block_duplicate: false,
      suppress_final: false,
      reason: "medium priority — delayed",
    };
  }

  if (policy.highlight === "LOW") {
    return {
      ecId,
      send_notification: false,
      timing: "batch",
      should_block_duplicate: false,
      suppress_final: false,
      reason: "low priority — batch only",
    };
  }

  return suppressedDecision(ecId, suppressReasonDefault());
}

function applyBatchCoalescing(
  decisions: NotificationExecutionDecision[]
): NotificationExecutionDecision[] {
  const pendingBatch = decisions.filter(
    (item) =>
      item.send_notification &&
      (item.timing === "delayed" || item.timing === "batch")
  );

  if (pendingBatch.length < 2) {
    return decisions;
  }

  const batchIds = new Set(pendingBatch.map((item) => item.ecId));
  return decisions.map((item) => {
    if (!batchIds.has(item.ecId) || !item.send_notification) {
      return item;
    }
    return {
      ...item,
      timing: "batch" as NotificationTiming,
      reason: item.reason.includes("batch")
        ? item.reason
        : `${item.reason}; coalesced batch`,
    };
  });
}

/** Execution control for one behavior policy — pure, no mutation. */
export function decideNotificationExecution(
  policy: EventBehaviorPolicy,
  context: NotificationShadowContext = {}
): NotificationExecutionDecision | null {
  if (!isValidNotificationEcId(policy.ecId)) {
    return null;
  }

  return executionFromBehavior(policy, {
    ...context,
    cooldownMs: context.cooldownMs ?? DEFAULT_NOTIFICATION_COOLDOWN_MS,
  });
}

function stableSortDecisions(
  items: NotificationExecutionDecision[]
): NotificationExecutionDecision[] {
  return [...items].sort((left, right) => left.ecId.localeCompare(right.ecId));
}

function decisionsEqual(
  left: NotificationExecutionDecision[],
  right: NotificationExecutionDecision[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return JSON.stringify(stableSortDecisions(left)) === JSON.stringify(stableSortDecisions(right));
}

/**
 * Convert Behavior Engine policies into safe notification execution decisions.
 * Does NOT alter behavior policies or re-score opportunities.
 */
export function decideNotificationExecutions(
  policies: readonly EventBehaviorPolicy[],
  context: NotificationShadowContext = {}
): NotificationShadowResult {
  if (!Array.isArray(policies) || policies.length === 0) {
    return "NO_ACTION";
  }

  const compute = (items: readonly EventBehaviorPolicy[]) =>
    applyBatchCoalescing(
      items
        .map((item) => decideNotificationExecution(item, context))
        .filter((item): item is NotificationExecutionDecision => item != null)
    );

  const passA = compute(policies);
  const passB = compute(policies);

  if (passA.length === 0) {
    return "NO_ACTION";
  }

  if (!decisionsEqual(passA, passB)) {
    return "NO_ACTION";
  }

  const executable = passA.filter((item) => item.send_notification && !item.suppress_final);
  if (executable.length === 0) {
    return "NO_ACTION";
  }

  return passA;
}

export type { NotificationShadowContext, NotificationShadowResult, NotificationExecutionDecision };
