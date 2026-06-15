import type { CognitiveContext } from "@/lib/context-builder/types";
import type { VisibilitySurface } from "@/lib/visibility-bridge/types";

export type UnifiedSurfaceMap = {
  CALENDAR: string[];
  DOCK: string[];
  TIMELINE: string[];
  NARRATION: string[];
};

export type SurfaceTruthDecision = {
  opportunityId: string;
  visible?: boolean;
  surface: VisibilitySurface | null;
  recommendedSurfaceHint: string;
  finalSurface?: string;
};

export type SurfaceRouterOutput = {
  opportunityId: string;
  routedSurface: string;
};

export type SurfaceRenderInput = {
  opportunityId: string;
  renderSurface: string;
};

export type SurfaceTruthContext = Pick<CognitiveContext, "attentionState" | "suppressionMap">;

export type ConflictResolution = {
  opportunityId: string;
  selectedSurface: string;
  conflictSources: string[];
  resolutionReason: string;
};

export type IgnoredSurfaces = {
  SurfaceRouter: string[];
  SurfaceRender: string[];
};

export type UnifySurfaceTruthInput = {
  decisions: readonly SurfaceTruthDecision[];
  routerOutputs: readonly SurfaceRouterOutput[];
  renderInputs: readonly SurfaceRenderInput[];
  context: SurfaceTruthContext;
};

export type UnifySurfaceTruthResult = {
  unifiedSurfaceMap: UnifiedSurfaceMap;
  conflictsResolved: ConflictResolution[];
  ignoredSurfaces: IgnoredSurfaces;
};

export const VALID_SURFACES: readonly VisibilitySurface[] = [
  "CALENDAR",
  "DOCK",
  "TIMELINE",
  "NARRATION",
];

export const DEFAULT_FALLBACK_SURFACE: VisibilitySurface = "DOCK";
