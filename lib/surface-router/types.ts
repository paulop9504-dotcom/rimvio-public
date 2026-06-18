import type { AttentionState, CognitiveContext } from "@/lib/context-builder/types";
import type { VisibilityDecision, VisibilitySurface } from "@/lib/visibility-bridge/types";

export type SurfaceRouterContext = Pick<
  CognitiveContext,
  "now" | "attentionState" | "activeIntents" | "recentTopSignals" | "suppressionMap"
>;

export type SurfaceMap = {
  CALENDAR: string[];
  DOCK: string[];
  TIMELINE: string[];
  NARRATION: string[];
};

export type SurfaceRouterResult = {
  surfaceMap: SurfaceMap;
  hidden: string[];
};

export type RouteSurfacesInput = {
  decisions: readonly VisibilityDecision[];
  context: SurfaceRouterContext;
};

export const SURFACE_DENSITY_LIMITS: Record<VisibilitySurface, number> = {
  CALENDAR: 5,
  DOCK: 10,
  TIMELINE: 7,
  NARRATION: 5,
};

export const HIGH_RELEVANCE_VISIBILITY = 0.7;
