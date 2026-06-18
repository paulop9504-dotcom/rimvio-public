import type { RankedSurface, SurfaceEngineResult } from "@/lib/surface-engine/surface-contract";
import { buildSurfaceGraph } from "@/lib/surface-composition/build-surface-graph";
import { resolveCompositionLayout } from "@/lib/surface-composition/resolve-composition-layout";
import type { SurfaceCompositionFrame } from "@/lib/surface-composition/surface-node-contract";

/** Full composition frame from engine output — UI hooks call this only. */
export function composeSurfaceFrame(
  engine: SurfaceEngineResult,
  channelSurfaces: readonly RankedSurface[],
): SurfaceCompositionFrame {
  const graph = buildSurfaceGraph(engine, channelSurfaces);
  const layout = resolveCompositionLayout(graph);
  return {
    graph,
    layout,
    collapse: graph.collapse,
    engine: {
      contractVersion: engine.contractVersion,
      computedAt: engine.computedAt,
      uxState: engine.uxState,
    },
  };
}

/** Incremental key for React diff — changes only when engine frame changes. */
export function surfaceCompositionFrameKey(frame: SurfaceCompositionFrame): string {
  const primaryId = frame.layout.primary?.id ?? "none";
  const latentIds = frame.collapse.latentSurfaceIds.join(",");
  return `${frame.engine.computedAt}:${frame.engine.uxState}:${primaryId}:latent:${latentIds}`;
}
