import type { ContainerOrigin, PriorityVisualState } from "@/lib/dock-feed/types";

export type TimelineSectionName = "Today" | "Tomorrow" | "Week" | "Later";

export type TimelineVisualState = "expanded" | "compact" | "dimmed";

export type TimelineItem = {
  ecId: string;
  title: string;
  time_label: string;
  /** ISO local start from Event SSOT (timeline read path only). */
  startAt: string | null;
  visual_state: TimelineVisualState;
  priority: PriorityVisualState;
  container_origin: ContainerOrigin;
};

export type TimelineSection = {
  section: TimelineSectionName;
  items: TimelineItem[];
};

export type TimelineProjectionContext = {
  focusedEcId?: string | null;
  recentEcIds?: readonly string[];
  now?: Date;
};

export type TimelineProjectionResult = TimelineSection[];

export const TIMELINE_SECTION_ORDER: readonly TimelineSectionName[] = [
  "Today",
  "Tomorrow",
  "Week",
  "Later",
];

export const NEAR_TIME_MS = 2 * 60 * 60 * 1000;
