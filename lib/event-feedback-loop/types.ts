import type { AttentionState } from "@/lib/context-builder/types";
import type { VisibilitySurface } from "@/lib/visibility-bridge/types";

export type UserInteractionAction =
  | "CLICK"
  | "IGNORE"
  | "DISMISS"
  | "COMPLETE"
  | "HOVER_LONG";

export type UserInteractionEvent = {
  opportunityId: string;
  surface: VisibilitySurface;
  action: UserInteractionAction;
  dwellTime?: number;
  timestamp: number;
};

export type SurfaceBiasMap = Record<VisibilitySurface, number>;

export type CurrentSystemState = {
  suppressionMap: Record<string, number>;
  surfaceBias: Partial<SurfaceBiasMap> & Record<string, number>;
  opportunityHistory: Record<string, number>;
  attentionState: AttentionState;
};

export type EventFeedbackLoopInput = {
  events: readonly UserInteractionEvent[];
  state: CurrentSystemState;
};

export type EventFeedbackLoopResult = {
  updatedSuppressionMap: Record<string, number>;
  updatedSurfaceBias: SurfaceBiasMap;
  attentionState: AttentionState;
  driftSignals: string[];
};

export const SUPPRESSION_DELTAS: Record<UserInteractionAction, number> = {
  DISMISS: 0.3,
  IGNORE: 0.1,
  CLICK: -0.15,
  COMPLETE: -0.4,
  HOVER_LONG: -0.05,
};

export const TIMELINE_LONG_DWELL_MS = 3_000;

export const DEFAULT_SURFACE_BIAS = 0.5;
