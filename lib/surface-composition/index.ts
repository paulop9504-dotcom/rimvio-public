/**
 * Surface Composition Runtime — graph + layout from Surface Engine only.
 * @see docs/RIMVIO_COMPOSABLE_SURFACE_UI_V1_REPORT.md
 */
export {
  SURFACE_COMPOSITION_VERSION,
  type LayoutSlot,
  type SurfaceMfeId,
  type SurfaceNode,
  type SurfaceGraph,
  type CompositionLayout,
  type SurfaceCompositionFrame,
  type DispatchSurfaceAction,
} from "@/lib/surface-composition/surface-node-contract";

export { buildSurfaceGraph } from "@/lib/surface-composition/build-surface-graph";
export { resolveCompositionLayout } from "@/lib/surface-composition/resolve-composition-layout";
export {
  composeSurfaceFrame,
  surfaceCompositionFrameKey,
} from "@/lib/surface-composition/compose-surface-frame";
export {
  resolveSurfaceMfeId,
  resolveUiComponents,
} from "@/lib/surface-composition/mfe-registry";
export {
  collapseSurfaceDecisionStream,
  hasActiveDecisionStream,
  shouldRenderLatentSuggestionLayers,
  resetSurfaceCollapseStateForTests,
  type SurfaceCollapseResult,
  type SurfaceTransitionEvent,
  type SurfaceTransitionKind,
} from "@/lib/surface-composition/surface-collapse-controller";

export { deriveSurfaceWhyLineKo } from "@/lib/surface-composition/surface-why-copy";
export { deriveLoopContextKo } from "@/lib/surface-composition/loop-why-copy";
export {
  SURFACE_IGNORE_OBSERVED_EVENT,
  type SurfaceIgnoreObservedDetail,
} from "@/lib/surface-composition/surface-ux-events";
export { commitSurfaceIgnoreObservation } from "@/lib/surface-composition/surface-ignore-bridge";
export {
  derivePrimarySuccessMessage,
  derivePrimaryErrorMessage,
} from "@/lib/surface-composition/surface-success-copy";
