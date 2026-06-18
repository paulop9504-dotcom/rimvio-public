import { readSurface } from "@/lib/life-read-model/read-surface";
import type { SurfaceReadBundle, SurfaceReadInput } from "@/lib/life-read-model/types";

/**
 * Decision-layer projections for Surface Engine (timeline, dock, routes, actions).
 * Surface Engine may call this; UI components must not.
 */
export function readSurfaceDependencies(
  input: SurfaceReadInput = {},
): SurfaceReadBundle {
  return readSurface(input);
}
