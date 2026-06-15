import type { ContainerReworkResult } from "@/lib/container-rework/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { composeTimelineProjection } from "@/lib/timeline-projection/compose-timeline-projection";
import type {
  TimelineProjectionContext,
  TimelineProjectionResult,
} from "@/lib/timeline-projection/types";

/**
 * Pure display projection from pre-computed routes — no decision rerun, no writes.
 */
export function projectTimelineDisplayFromRoutes(
  routes: ContainerReworkResult,
  resolveEvent: (ecId: string) => EventCandidate | null,
  context: TimelineProjectionContext = {},
): TimelineProjectionResult {
  if (routes === "NO_ACTION") {
    return [];
  }
  return composeTimelineProjection(routes, resolveEvent, context);
}
