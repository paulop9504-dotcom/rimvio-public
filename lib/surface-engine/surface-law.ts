import type { RankedSurface, SurfaceAction } from "@/lib/surface-engine/surface-contract";

const MAX_SECONDARY = 4;
const MAX_PROMINENT_SURFACES = 3;

/**
 * Surface Law enforcement — reduce decision cost.
 */
export function enforceSurfaceLaw(surface: RankedSurface): RankedSurface {
  const secondary = surface.secondaryActions.slice(0, MAX_SECONDARY);
  const resources = surface.resources.slice(0, 6);
  const events = surface.events.slice(0, 3);

  return {
    ...surface,
    primaryAction: surface.primaryAction,
    secondaryActions: secondary,
    resources,
    events,
  };
}

export function capProminentSurfaces(surfaces: readonly RankedSurface[]): RankedSurface[] {
  let prominentCount = 0;
  return surfaces.map((surface) => {
    if (surface.visibility !== "prominent") {
      return surface;
    }
    prominentCount += 1;
    if (prominentCount > MAX_PROMINENT_SURFACES) {
      return { ...surface, visibility: "normal" };
    }
    return surface;
  });
}

export function assertPrimaryAction(surface: RankedSurface): SurfaceAction {
  if (!surface.primaryAction || surface.primaryAction.kind !== "primary") {
    throw new Error(`Surface ${surface.id} missing primary action`);
  }
  return surface.primaryAction;
}
