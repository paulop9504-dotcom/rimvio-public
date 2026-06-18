/**
 * Timeline Projection — public read API (display layer only).
 */
export {
  TIMELINE_LAYER_CONTRACT,
  TIMELINE_FORBIDDEN_WRITE_SYMBOLS,
  TIMELINE_FORBIDDEN_IMPORTER_PREFIXES,
} from "@/lib/timeline-projection/timeline-layer-contract";

export type {
  TimelineItem,
  TimelineProjectionContext,
  TimelineProjectionResult,
  TimelineSection,
  TimelineSectionName,
  TimelineVisualState,
} from "@/lib/timeline-projection/types";

export {
  TIMELINE_SECTION_ORDER,
  NEAR_TIME_MS,
} from "@/lib/timeline-projection/types";

export { composeTimelineProjection } from "@/lib/timeline-projection/compose-timeline-projection";

export { projectTimelineDisplayFromRoutes } from "@/lib/timeline-projection/project-display-from-routes";

export { listTimelineProjectionFromStore } from "@/lib/timeline-projection/list-timeline-projection";
