import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type {
  CompositionLayout,
  SurfaceGraph,
  SurfaceNode,
} from "@/lib/surface-composition/surface-node-contract";

function pickTopContext(primary: SurfaceNode | null): SurfaceNode | null {
  if (!primary?.narration?.summary) {
    return null;
  }
  return {
    ...primary,
    layoutSlot: "top_context",
    mfeId: primary.mfeId,
    uiComponents: ["SurfaceNarrationLine"],
    capabilityBindings: primary.capabilityBindings,
  };
}

function collectDockCapabilities(nodes: readonly SurfaceNode[]): CapabilityId[] {
  const seen = new Set<CapabilityId>();
  const out: CapabilityId[] = [];
  const add = (id: CapabilityId) => {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  };
  for (const node of nodes) {
    add(node.capabilityBindings.primary);
    for (const cap of node.capabilityBindings.secondary) {
      add(cap);
    }
  }
  return out.slice(0, 8);
}

/**
 * SurfaceGraph → slot grid (one primary, bounded secondary, dock caps).
 */
export function resolveCompositionLayout(graph: SurfaceGraph): CompositionLayout {
  const primary =
    graph.nodes.find((node) => node.layoutSlot === "primary") ?? graph.nodes[0] ?? null;
  /** Decision stream collapse — secondary surfaces are latent only. */
  const secondary: SurfaceNode[] = [];

  return {
    computedAt: graph.computedAt,
    uxState: graph.uxState,
    topContext: pickTopContext(primary),
    primary,
    secondary,
    actionDockCapabilities: collectDockCapabilities(graph.nodes),
  };
}
