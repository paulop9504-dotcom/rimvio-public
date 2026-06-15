import type { RankedSurface, SurfaceEngineResult } from "@/lib/surface-engine/surface-contract";
import {
  collapseSurfaceDecisionStream,
} from "@/lib/surface-composition/surface-collapse-controller";
import {
  resolveSurfaceMfeId,
  resolveUiComponents,
} from "@/lib/surface-composition/mfe-registry";
import type { LayoutSlot, SurfaceGraph, SurfaceNode } from "@/lib/surface-composition/surface-node-contract";

function visibleSurfaces(surfaces: readonly RankedSurface[]): RankedSurface[] {
  return [...surfaces]
    .filter((row) => row.visibility !== "hidden")
    .sort((a, b) => b.priority.surfacePriorityScore - a.priority.surfacePriorityScore);
}

function toNode(
  surface: RankedSurface,
  layoutSlot: LayoutSlot,
  uxState: SurfaceEngineResult["uxState"],
): SurfaceNode {
  const mfeId = resolveSurfaceMfeId(surface, uxState, "primary");
  return {
    ...surface,
    layoutSlot,
    mfeId,
    capabilityBindings: {
      primary: surface.primaryAction.capabilityId,
      secondary: surface.secondaryActions.map((action) => action.capabilityId),
    },
    uiComponents: resolveUiComponents(mfeId),
  };
}

function emptyCollapseSnapshot(): SurfaceGraph["collapse"] {
  return {
    activeSurfaceId: null,
    latentSurfaceIds: [],
    selectionScore: 0,
  };
}

/**
 * Surface list → composition graph — exactly ONE active decision node.
 * Additional candidates live in `latentSurfaces` (not rendered).
 */
export function buildSurfaceGraph(
  engine: SurfaceEngineResult,
  channelSurfaces: readonly RankedSurface[],
): SurfaceGraph {
  const uxState = engine.uxState;
  const visible = visibleSurfaces(channelSurfaces);
  const collapsed = collapseSurfaceDecisionStream(visible, {
    uxState,
    reason: "decision_stream_collapse",
  });

  const collapseSnapshot: SurfaceGraph["collapse"] = {
    activeSurfaceId: collapsed.activeSurface?.id ?? null,
    latentSurfaceIds: collapsed.latentSurfaces.map((row) => row.id),
    selectionScore: collapsed.selectionScore,
  };

  const nodes: SurfaceNode[] = [];

  if (collapsed.activeSurface) {
    nodes.push(toNode(collapsed.activeSurface, "primary", uxState));
    return {
      version: 1,
      computedAt: engine.computedAt,
      uxState,
      nodes,
      latentSurfaces: collapsed.latentSurfaces,
      collapse: collapseSnapshot,
    };
  }

  const fallback = visibleSurfaces(engine.surfaces)[0];
  if (fallback) {
    nodes.push(toNode(fallback, "primary", uxState));
    return {
      version: 1,
      computedAt: engine.computedAt,
      uxState,
      nodes,
      latentSurfaces: collapsed.latentSurfaces,
      collapse: {
        activeSurfaceId: fallback.id,
        latentSurfaceIds: collapseSnapshot.latentSurfaceIds,
        selectionScore: fallback.priority.surfacePriorityScore,
      },
    };
  }

  return {
    version: 1,
    computedAt: engine.computedAt,
    uxState,
    nodes,
    latentSurfaces: collapsed.latentSurfaces,
    collapse: emptyCollapseSnapshot(),
  };
}
