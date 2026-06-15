import type { VisibilityDecision, VisibilitySurface } from "@/lib/visibility-bridge/types";
import {
  HIGH_RELEVANCE_VISIBILITY,
  SURFACE_DENSITY_LIMITS,
  type RouteSurfacesInput,
  type SurfaceMap,
  type SurfaceRouterContext,
  type SurfaceRouterResult,
} from "@/lib/surface-router/types";

const SURFACES: VisibilitySurface[] = ["CALENDAR", "DOCK", "TIMELINE", "NARRATION"];

const SCATTERED_CALENDAR_CAP = 2;

function emptySurfaceMap(): SurfaceMap {
  return {
    CALENDAR: [],
    DOCK: [],
    TIMELINE: [],
    NARRATION: [],
  };
}

function parseSurface(value: string | null | undefined): VisibilitySurface | null {
  if (!value || value === "none") {
    return null;
  }
  const upper = value.toUpperCase();
  return SURFACES.includes(upper as VisibilitySurface) ? (upper as VisibilitySurface) : null;
}

function isUrgentDecision(decision: VisibilityDecision): boolean {
  return (
    decision.visibilityScore >= HIGH_RELEVANCE_VISIBILITY ||
    decision.tieBreakReason.includes("time_sensitive") ||
    decision.surface === "CALENDAR"
  );
}

function isReengagementDecision(decision: VisibilityDecision): boolean {
  return (
    decision.opportunityId.toUpperCase().includes("REENGAGEMENT") ||
    decision.tieBreakReason.includes("reengagement")
  );
}

function resolveBaseSurface(decision: VisibilityDecision): VisibilitySurface | null {
  return decision.surface ?? parseSurface(decision.finalSurface);
}

function applyAttentionOverride(
  decision: VisibilityDecision,
  context: SurfaceRouterContext,
  base: VisibilitySurface
): VisibilitySurface {
  const { attentionState } = context;

  if (attentionState === "FOCUSED") {
    if (base === "DOCK" && decision.visibilityScore < HIGH_RELEVANCE_VISIBILITY) {
      return "TIMELINE";
    }
    return base;
  }

  if (attentionState === "SCATTERED") {
    if ((base === "CALENDAR" || base === "TIMELINE") && !isUrgentDecision(decision)) {
      return "DOCK";
    }
    return base;
  }

  if (isReengagementDecision(decision) && base !== "DOCK") {
    return "NARRATION";
  }

  if (base === "CALENDAR" && !isUrgentDecision(decision)) {
    return "DOCK";
  }

  return base;
}

function enforceSurfaceRules(
  decision: VisibilityDecision,
  surface: VisibilitySurface
): VisibilitySurface {
  if (surface === "DOCK" && isUrgentDecision(decision)) {
    return "CALENDAR";
  }

  if (surface === "NARRATION" && isUrgentDecision(decision)) {
    return "TIMELINE";
  }

  return surface;
}

function applyDensityPreference(
  decision: VisibilityDecision,
  context: SurfaceRouterContext,
  surface: VisibilitySurface,
  calendarCount: number
): VisibilitySurface {
  if (context.attentionState === "SCATTERED" && surface === "CALENDAR") {
    if (!isUrgentDecision(decision)) {
      return "DOCK";
    }
    if (calendarCount >= SCATTERED_CALENDAR_CAP) {
      return "DOCK";
    }
  }

  return surface;
}

function routeTargetSurface(
  decision: VisibilityDecision,
  context: SurfaceRouterContext,
  calendarCount: number
): VisibilitySurface | null {
  const base = resolveBaseSurface(decision);
  if (!base) {
    return null;
  }

  const overridden = applyAttentionOverride(decision, context, base);
  const ruled = enforceSurfaceRules(decision, overridden);
  return applyDensityPreference(decision, context, ruled, calendarCount);
}

function sortDecisions(decisions: readonly VisibilityDecision[]): VisibilityDecision[] {
  return [...decisions].sort((left, right) => {
    if (right.visibilityScore !== left.visibilityScore) {
      return right.visibilityScore - left.visibilityScore;
    }
    return left.opportunityId.localeCompare(right.opportunityId);
  });
}

/** SurfaceRouter v1 — Visibility decisions → final UI surface allocation. */
export function routeSurfaces(input: RouteSurfacesInput): SurfaceRouterResult {
  const { decisions, context } = input;
  const surfaceMap = emptySurfaceMap();
  const hidden: string[] = [];
  const assigned = new Set<string>();
  const counts: Record<VisibilitySurface, number> = {
    CALENDAR: 0,
    DOCK: 0,
    TIMELINE: 0,
    NARRATION: 0,
  };

  for (const decision of sortDecisions(decisions)) {
    if (!decision.visible) {
      hidden.push(decision.opportunityId);
      continue;
    }

    if (assigned.has(decision.opportunityId)) {
      hidden.push(decision.opportunityId);
      continue;
    }

    const target = routeTargetSurface(decision, context, counts.CALENDAR);
    if (!target) {
      hidden.push(decision.opportunityId);
      continue;
    }

    const limit = SURFACE_DENSITY_LIMITS[target];
    if (counts[target] >= limit) {
      hidden.push(decision.opportunityId);
      continue;
    }

    surfaceMap[target].push(decision.opportunityId);
    counts[target] += 1;
    assigned.add(decision.opportunityId);
  }

  for (const surface of SURFACES) {
    surfaceMap[surface].sort((left, right) => left.localeCompare(right));
  }
  hidden.sort((left, right) => left.localeCompare(right));

  return { surfaceMap, hidden };
}
