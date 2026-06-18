/**
 * Timeline layer — display-only. No Event SSOT writes.
 * @see docs/TIMELINE_PROJECTION.md
 */
import { readSurface } from "@/lib/life-read-model";
import type { TimelineProjectionContext, TimelineProjectionResult } from "@/lib/timeline-projection/types";
import type { BehaviorEngineContext } from "@/lib/behavior-engine/types";
import type { NotificationShadowContext } from "@/lib/notification-shadow/types";
import type { OpportunityEngineContext } from "@/lib/opportunity-engine/types";

export type {
  TimelineItem,
  TimelineProjectionContext,
  TimelineProjectionResult,
  TimelineSection,
  TimelineSectionName,
  TimelineVisualState,
} from "@/lib/timeline-projection/types";

export { composeTimelineProjection } from "@/lib/timeline-projection/compose-timeline-projection";
export { projectTimelineDisplayFromRoutes } from "@/lib/timeline-projection/project-display-from-routes";

/**
 * Decision read (once) → timeline display. Does not write SSOT or schedule.
 */
export function listTimelineProjectionFromStore(input: {
  opportunityContext?: OpportunityEngineContext;
  behaviorContext?: BehaviorEngineContext;
  notificationContext?: NotificationShadowContext;
  timelineContext?: TimelineProjectionContext;
} = {}): TimelineProjectionResult {
  const now = input.timelineContext?.now ?? input.opportunityContext?.now ?? new Date();
  return readSurface({
    opportunityContext: input.opportunityContext,
    behaviorContext: input.behaviorContext,
    notificationContext: input.notificationContext,
    timelineContext: {
      focusedEcId: input.timelineContext?.focusedEcId,
      recentEcIds: input.timelineContext?.recentEcIds,
      now,
    },
  }).timeline;
}
