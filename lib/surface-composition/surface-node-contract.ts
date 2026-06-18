import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type {
  RankedSurface,
  SurfaceAction,
  SurfaceEngineResult,
  SurfaceUxState,
} from "@/lib/surface-engine/surface-contract";

export const SURFACE_COMPOSITION_VERSION = 1 as const;

/** Dynamic layout grid slots — not screen names. */
export type LayoutSlot =
  | "top_context"
  | "primary"
  | "secondary"
  | "action_dock";

export type SurfaceMfeId =
  | "PrimarySurfaceMF"
  | "TravelSurfaceMF"
  | "ScheduleSurfaceMF"
  | "ReminderSurfaceMF"
  | "FoodSurfaceMF"
  | "GoalSurfaceMF"
  | "IdleSurfaceMF"
  | "StartHereSurfaceMF"
  | "IntentMergedSurfaceMF"
  | "SurfaceStackCollapsedMF"
  | "GenericSurfaceMF";

/**
 * Composition node — Surface Engine output adapted for UI runtime only.
 * Not SSOT; rebuild from `SurfaceEngineResult` on every frame.
 */
export type SurfaceNode = RankedSurface & {
  layoutSlot: LayoutSlot;
  mfeId: SurfaceMfeId;
  capabilityBindings: {
    primary: CapabilityId;
    secondary: readonly CapabilityId[];
  };
  uiComponents: readonly string[];
  /** Collapsed stack peers (overloaded / low-signal only). */
  stackPeers?: readonly RankedSurface[];
};

export type SurfaceCollapseSnapshot = {
  activeSurfaceId: string | null;
  latentSurfaceIds: readonly string[];
  selectionScore: number;
};

export type SurfaceGraph = {
  version: typeof SURFACE_COMPOSITION_VERSION;
  computedAt: string;
  uxState: SurfaceUxState;
  nodes: readonly SurfaceNode[];
  /** Not rendered — ranked below active (decision stream collapse). */
  latentSurfaces: readonly RankedSurface[];
  collapse: SurfaceCollapseSnapshot;
};

export type CompositionLayout = {
  computedAt: string;
  uxState: SurfaceUxState;
  topContext: SurfaceNode | null;
  primary: SurfaceNode | null;
  secondary: readonly SurfaceNode[];
  /** Capability ids for action dock MF (from engine, not computed in UI). */
  actionDockCapabilities: readonly CapabilityId[];
};

export type SurfaceCompositionFrame = {
  graph: SurfaceGraph;
  layout: CompositionLayout;
  engine: Pick<SurfaceEngineResult, "contractVersion" | "computedAt" | "uxState">;
  collapse: SurfaceCollapseSnapshot;
};

export type DispatchSurfaceAction = (
  node: SurfaceNode,
  action: SurfaceAction,
) => void;
