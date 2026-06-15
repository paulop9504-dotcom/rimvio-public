/**
 * Single decision-stack read shared by display projections (timeline, dock, narration).
 * Call once per UI frame; fan out routes to timeline/dock — do not feed display back into decision.
 */
import { listContainerRoutesFromStore } from "@/lib/container-rework/list-container-routes";
import type { BehaviorEngineContext } from "@/lib/behavior-engine/types";
import type { NotificationShadowContext } from "@/lib/notification-shadow/types";
import type { OpportunityEngineContext } from "@/lib/opportunity-engine/types";
import type { ContainerReworkResult } from "@/lib/container-rework/types";

export type DisplayRoutesContext = {
  opportunityContext?: OpportunityEngineContext;
  behaviorContext?: BehaviorEngineContext;
  notificationContext?: NotificationShadowContext;
  timelineContext?: {
    focusedEcId?: string | null;
    recentEcIds?: readonly string[];
    now?: Date;
  };
};

export function listDisplayRoutesFromStore(
  input: DisplayRoutesContext = {},
): ContainerReworkResult {
  const now =
    input.timelineContext?.now ??
    input.opportunityContext?.now ??
    new Date();

  return listContainerRoutesFromStore({
    opportunityContext: { ...input.opportunityContext, now },
    behaviorContext: input.behaviorContext,
    notificationContext: input.notificationContext,
    ui: {
      focusedEcId:
        input.timelineContext?.focusedEcId ??
        input.behaviorContext?.focusedEcId ??
        input.opportunityContext?.focusedEcId ??
        input.notificationContext?.dockFocusedEcId,
    },
  });
}
