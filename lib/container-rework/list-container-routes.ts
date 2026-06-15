import { mergeDecisionEntries } from "@/lib/container-rework/types";
import { routeContainerRework } from "@/lib/container-rework/route-container-rework";
import type {
  ContainerReworkResult,
  ContainerUiState,
} from "@/lib/container-rework/types";
import type { BehaviorEngineResult } from "@/lib/behavior-engine/types";
import type { NotificationShadowResult } from "@/lib/notification-shadow/types";
import type { EventOpportunitySignal } from "@/lib/opportunity-engine/types";
import { listNotificationExecutions } from "@/lib/notification-shadow/list-notification-executions";
import { listEventBehaviors } from "@/lib/behavior-engine/list-event-behaviors";
import { listRankedEventOpportunities } from "@/lib/opportunity-engine/rank-event-opportunities";
import type { BehaviorEngineContext } from "@/lib/behavior-engine/types";
import type { NotificationShadowContext } from "@/lib/notification-shadow/types";
import type { OpportunityEngineContext } from "@/lib/opportunity-engine/types";

export type {
  ContainerReworkEntry,
  ContainerReworkResult,
  ContainerRoute,
  ContainerUiState,
  UiContainer,
} from "@/lib/container-rework/types";

export {
  routeContainerRework,
  routeEventContainers,
} from "@/lib/container-rework/route-container-rework";

export { mergeDecisionEntries } from "@/lib/container-rework/types";

/** Route pre-computed decision layer outputs into UI containers. */
export function routeFromDecisionLayers(input: {
  opportunities?: readonly EventOpportunitySignal[];
  behaviors: BehaviorEngineResult;
  notifications: NotificationShadowResult;
  ui?: ContainerUiState;
}): ContainerReworkResult {
  if (input.behaviors === "NO_ACTION") {
    return "NO_ACTION";
  }

  const notifications =
    input.notifications === "NO_ACTION" ? [] : input.notifications;

  return routeContainerRework(
    mergeDecisionEntries({
      opportunities: input.opportunities,
      behaviors: input.behaviors,
      notifications,
    }),
    input.ui ?? {}
  );
}

/** Full decision stack → container routing (read-only). */
export function listContainerRoutesFromStore(input: {
  opportunityContext?: OpportunityEngineContext;
  behaviorContext?: BehaviorEngineContext;
  notificationContext?: NotificationShadowContext;
  ui?: ContainerUiState;
} = {}): ContainerReworkResult {
  const opportunities = listRankedEventOpportunities(input.opportunityContext ?? {});
  const behaviors = listEventBehaviors(
    input.opportunityContext ?? {},
    input.behaviorContext ?? {}
  );
  const notifications = listNotificationExecutions(behaviors, input.notificationContext ?? {});

  return routeFromDecisionLayers({
    opportunities,
    behaviors,
    notifications,
    ui: {
      dockVisible: input.ui?.dockVisible ?? input.notificationContext?.dockVisible,
      chatVisible: input.ui?.chatVisible,
      timelineVisible: input.ui?.timelineVisible,
      focusedEcId:
        input.ui?.focusedEcId ??
        input.behaviorContext?.focusedEcId ??
        input.opportunityContext?.focusedEcId ??
        input.notificationContext?.dockFocusedEcId,
    },
  });
}
