/**
 * Rimvio surface layer — engine ranking + UI composition (single active decision stream).
 */
export {
  composeSurfaceFrame,
  buildSurfaceGraph,
  collapseSurfaceDecisionStream,
  hasActiveDecisionStream,
  shouldRenderLatentSuggestionLayers,
  type SurfaceCompositionFrame,
  type SurfaceCollapseSnapshot,
} from "@/lib/surface-composition";

export {
  resolveSurfaces,
  selectPrimaryAction,
  SURFACE_CONTRACT_VERSION,
  type Surface,
  type SurfaceAction,
  type SurfaceBuildContext,
} from "@/lib/surface-engine";
