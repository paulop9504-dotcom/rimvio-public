import type { LifeProjections } from "@/lib/life-read-model/types";
import type {
  Surface,
  SurfaceBuildContext,
  SurfaceUxState,
} from "@/lib/surface-engine/surface-contract";

export type { SurfaceUxState };

export const UX_OVERLOAD_THRESHOLD = 5;
export const UX_MAX_TOP_SURFACES = 3;
export const UX_LOW_SIGNAL_SCORE_CAP = 50;

export const FALLBACK_SURFACE_PREFIX = "surface:rimvio:" as const;

export function isFallbackSurface(surface: Pick<Surface, "id">): boolean {
  return surface.id.startsWith(FALLBACK_SURFACE_PREFIX);
}

export function countVisibleSurfaces(surfaces: readonly Surface[]): number {
  return surfaces.filter((row) => row.visibility !== "hidden").length;
}

/**
 * Deterministic UX state — drives polish rules only (not SSOT).
 */
export function detectSurfaceUxState(
  surfaces: readonly Surface[],
  life: LifeProjections,
  context: SurfaceBuildContext = {},
): SurfaceUxState {
  const visible = surfaces.filter((row) => row.visibility !== "hidden");
  const eventBacked = visible.filter((row) => !isFallbackSurface(row));

  if (life.events.length === 0 && eventBacked.length === 0) {
    return "empty";
  }

  if (visible.length === 0) {
    return surfaces.length === 0 ? "empty" : "idle";
  }

  if (visible.length > UX_OVERLOAD_THRESHOLD) {
    return "overloaded";
  }

  const weakMentioned = visible.filter((row) => isLowSignalSurface(row));
  if (weakMentioned.length >= 2) {
    return "low_signal";
  }

  const hasStrongIntent = visible.some(
    (row) =>
      row.priority.band === "critical" ||
      row.priority.band === "high" ||
      row.priority.surfacePriorityScore >= 55,
  );

  if (!hasStrongIntent && visible.length <= 2 && eventBacked.length <= 1) {
    return "idle";
  }

  if (hasStrongIntent) {
    return "active";
  }

  return visible.length >= 3 ? "low_signal" : "idle";
}

export function isLowSignalSurface(surface: Surface): boolean {
  if (isFallbackSurface(surface)) {
    return false;
  }
  const lifecycle = surface.events[0]?.lifecycle;
  const weakLifecycle = lifecycle === "mentioned" || surface.lifecycle === "draft";
  if (!weakLifecycle) {
    return false;
  }
  return surface.priority.surfacePriorityScore <= UX_LOW_SIGNAL_SCORE_CAP;
}
