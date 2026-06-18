import type { ContainerRoute } from "@/lib/container-rework/types";

export type PriorityVisualState = "HIGH" | "MEDIUM" | "LOW";

export type ContainerOrigin = "dock" | "timeline" | "notification_surface";

export type DockRenderMode = "full" | "compact" | "dimmed";

/** Netflix-style Dock card — presentation only, no scoring. */
export type DockCard = {
  ecId: string;
  title: string;
  subtitle: string;
  priority_visual_state: PriorityVisualState;
  container_origin: ContainerOrigin;
  highlight: boolean;
  render_mode: DockRenderMode;
  action_preview?: string;
  reason: string;
};

export type DockFeedContext = {
  focusedEcId?: string | null;
  recentEcIds?: readonly string[];
  scrollPosition?: number;
  dockVisible?: boolean;
};

export type DockFeedResult = DockCard[] | "NO_ACTION";

/** Valid container routes for Dock feed rendering. */
export type DockFeedInput = readonly ContainerRoute[];

export const DOCK_FEED_ORIGIN_RANK: Record<ContainerOrigin, number> = {
  notification_surface: 0,
  dock: 1,
  timeline: 2,
};

export const DOCK_FEED_PRIORITY_RANK: Record<PriorityVisualState, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};
