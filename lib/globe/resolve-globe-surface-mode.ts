import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";

export type GlobeSurfaceMode = "globe3d" | "vector2d";

/** Hand off at neighborhood scale — disabled; 3D globe only. */
export const GLOBE_VECTOR_ENTER_ALTITUDE = 0.065;

/** Vector map handoff disabled — always stay on 3D globe. */
export function shouldEnterVectorMap(_input: {
  altitude: number;
  detailLevel?: GlobeDetailLevel;
}): boolean {
  return false;
}

/** @deprecated Use vector2d handover — flat raster map removed. */
export type { GlobeSurfaceMode as GlobeFlatSurfaceMode };
export const GLOBE_FLAT_ENTER_ALTITUDE = GLOBE_VECTOR_ENTER_ALTITUDE;

/** @deprecated */
export function shouldEnterFlatMap(input: {
  altitude: number;
  detailLevel?: GlobeDetailLevel;
}): boolean {
  return shouldEnterVectorMap(input);
}

export function resolveGlobeSurfaceMode(
  _current: GlobeSurfaceMode,
  _input: { altitude: number; detailLevel?: GlobeDetailLevel },
): GlobeSurfaceMode {
  return "globe3d";
}
