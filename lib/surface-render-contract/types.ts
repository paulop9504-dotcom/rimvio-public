import type { ContextOpportunity } from "@/lib/cognitive-opportunity/types";
import type { CognitiveEvent } from "@/lib/context-builder/types";
import type { VisibilityDecision, VisibilitySurface } from "@/lib/visibility-bridge/types";

export type CalendarUiItem = {
  id: string;
  type: string;
  title: string;
  timestamp: number;
  urgency: number;
};

export type DockUiItem = {
  id: string;
  type: string;
  title: string;
  relevance: number;
};

export type TimelineUiItem = {
  id: string;
  type: string;
  title: string;
  start: number;
  end: number;
};

export type NarrationUiItem = {
  id: string;
  type: string;
  text: string;
};

export type SurfaceUiState = {
  CALENDAR: CalendarUiItem[];
  DOCK: DockUiItem[];
  TIMELINE: TimelineUiItem[];
  NARRATION: NarrationUiItem[];
};

export type SurfaceRenderResult = {
  uiState: SurfaceUiState;
};

export type RenderSurfaceUiInput = {
  decisions: readonly VisibilityDecision[];
  opportunities: readonly ContextOpportunity[];
  eventPool?: readonly CognitiveEvent[];
};

export const SURFACE_RENDER_DENSITY_LIMITS: Record<VisibilitySurface, number> = {
  CALENDAR: 5,
  DOCK: 10,
  TIMELINE: 7,
  NARRATION: 5,
};
