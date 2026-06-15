/** Crossfade bridge between 3D globe and MapLibre vector — the “middle” phase. */
export type GlobeSurfaceHandoffPhase =
  | "globe"
  | "to-vector"
  | "vector"
  | "to-globe";

export const GLOBE_SURFACE_CROSSFADE_MS = 520;

export function isGlobeSurfaceHandoffActive(
  phase: GlobeSurfaceHandoffPhase,
): boolean {
  return phase === "to-vector" || phase === "to-globe";
}

export function isVectorMapSurfaceActive(
  phase: GlobeSurfaceHandoffPhase,
): boolean {
  return phase === "to-vector" || phase === "vector" || phase === "to-globe";
}

export function isVectorMapInteractive(
  phase: GlobeSurfaceHandoffPhase,
): boolean {
  return phase === "vector";
}
