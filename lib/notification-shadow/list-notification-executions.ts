import type { BehaviorEngineResult } from "@/lib/behavior-engine/types";
import { listEventBehaviors } from "@/lib/behavior-engine/list-event-behaviors";
import type { BehaviorEngineContext } from "@/lib/behavior-engine/types";
import type { OpportunityEngineContext } from "@/lib/opportunity-engine/types";
import { decideNotificationExecutions } from "@/lib/notification-shadow/decide-notification-executions";
import type {
  NotificationShadowContext,
  NotificationShadowResult,
} from "@/lib/notification-shadow/types";

export type {
  NotificationExecutionDecision,
  NotificationHistoryEntry,
  NotificationShadowContext,
  NotificationShadowResult,
  NotificationTiming,
} from "@/lib/notification-shadow/types";

export {
  decideNotificationExecution,
  decideNotificationExecutions,
} from "@/lib/notification-shadow/decide-notification-executions";

/**
 * Compose Behavior Engine → Notification Shadow (read-only pipeline).
 * Does NOT mutate events, scores, or behavior policies.
 */
export function listNotificationExecutions(
  behaviorPolicies: BehaviorEngineResult,
  context: NotificationShadowContext = {}
): NotificationShadowResult {
  if (behaviorPolicies === "NO_ACTION") {
    return "NO_ACTION";
  }
  return decideNotificationExecutions(behaviorPolicies, context);
}

/** Full stack: Opportunity → Behavior → Notification Shadow. */
export function listNotificationExecutionsFromStore(input: {
  opportunityContext?: OpportunityEngineContext;
  behaviorContext?: BehaviorEngineContext;
  notificationContext?: NotificationShadowContext;
} = {}): NotificationShadowResult {
  const behaviors = listEventBehaviors(
    input.opportunityContext ?? {},
    input.behaviorContext ?? {}
  );
  return listNotificationExecutions(behaviors, input.notificationContext ?? {});
}
