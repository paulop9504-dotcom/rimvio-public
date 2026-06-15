import type { RankedSurface, SurfaceType, SurfaceUxState } from "@/lib/surface-engine/surface-contract";
import type { SurfaceMfeId } from "@/lib/surface-composition/surface-node-contract";
import { FALLBACK_SURFACE_PREFIX } from "@/lib/surface-engine/surface-ux-state";

function isStartHere(surface: Pick<RankedSurface, "id">): boolean {
  return surface.id.includes("start-here");
}

function isIdleStarter(surface: Pick<RankedSurface, "id">): boolean {
  return surface.id.includes(":idle");
}

function typeMfe(type: SurfaceType): SurfaceMfeId {
  switch (type) {
    case "travel":
      return "TravelSurfaceMF";
    case "schedule":
    case "work":
      return "ScheduleSurfaceMF";
    case "reminder":
      return "ReminderSurfaceMF";
    case "food":
    case "social":
      return "FoodSurfaceMF";
    case "goal":
      return "GoalSurfaceMF";
    default:
      return "GenericSurfaceMF";
  }
}

/** Map surface + UX state → micro frontend id (deterministic, no UI logic). */
export function resolveSurfaceMfeId(
  surface: RankedSurface,
  uxState: SurfaceUxState,
  role: "primary" | "secondary" | "stack",
): SurfaceMfeId {
  if (isStartHere(surface)) {
    return "StartHereSurfaceMF";
  }
  if (isIdleStarter(surface)) {
    return "IdleSurfaceMF";
  }

  if (role === "stack") {
    return "SurfaceStackCollapsedMF";
  }

  if (uxState === "low_signal" && role === "primary") {
    return "IntentMergedSurfaceMF";
  }

  if (uxState === "empty" && isStartHere(surface)) {
    return "StartHereSurfaceMF";
  }

  if (uxState === "idle" && isIdleStarter(surface)) {
    return "IdleSurfaceMF";
  }

  if (role === "primary") {
    if (uxState === "active" || uxState === "overloaded") {
      return typeMfe(surface.type);
    }
    return typeMfe(surface.type);
  }

  return "PrimarySurfaceMF";
}

export function resolveUiComponents(mfeId: SurfaceMfeId): readonly string[] {
  const base = ["PrimaryActionButton", "SurfaceNarrationLine"] as const;
  switch (mfeId) {
    case "SurfaceStackCollapsedMF":
      return [...base, "SurfaceStackList"];
    case "IntentMergedSurfaceMF":
      return [...base, "IntentMergeBadge"];
    case "StartHereSurfaceMF":
    case "IdleSurfaceMF":
      return [...base, "StartHereHero"];
    default:
      return [...base, "SurfaceCard"];
  }
}

export function isFallbackNode(surface: Pick<RankedSurface, "id">): boolean {
  return surface.id.startsWith(FALLBACK_SURFACE_PREFIX);
}
