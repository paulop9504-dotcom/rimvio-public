import type { SurfaceRouterResult } from "@/lib/surface-router/types";
import type { SurfaceUiState } from "@/lib/surface-render-contract/types";
import type { ContextOpportunity } from "@/lib/cognitive-opportunity/types";
import type { VisibilityDecision } from "@/lib/visibility-bridge/types";
import {
  DEFAULT_FALLBACK_SURFACE,
  VALID_SURFACES,
  type ConflictResolution,
  type IgnoredSurfaces,
  type SurfaceRenderInput,
  type SurfaceRouterOutput,
  type SurfaceTruthDecision,
  type UnifiedSurfaceMap,
  type UnifySurfaceTruthInput,
  type UnifySurfaceTruthResult,
} from "@/lib/surface-truth-unifier/types";
import type { VisibilitySurface } from "@/lib/visibility-bridge/types";

function emptySurfaceMap(): UnifiedSurfaceMap {
  return {
    CALENDAR: [],
    DOCK: [],
    TIMELINE: [],
    NARRATION: [],
  };
}

function isValidSurface(value: string | null | undefined): value is VisibilitySurface {
  if (!value) {
    return false;
  }
  const upper = value.toUpperCase();
  return VALID_SURFACES.includes(upper as VisibilitySurface);
}

function normalizeSurface(value: string | null | undefined): VisibilitySurface | null {
  if (!value || value === "none") {
    return null;
  }
  const upper = value.toUpperCase();
  return isValidSurface(upper) ? (upper as VisibilitySurface) : null;
}

function resolveAuthoritativeSurface(
  decision: SurfaceTruthDecision
): { surface: VisibilitySurface; reason: string } {
  const primary = normalizeSurface(decision.surface ?? undefined);
  if (primary) {
    return { surface: primary, reason: "visibility_decision_authoritative" };
  }

  const hint = normalizeSurface(decision.recommendedSurfaceHint);
  if (hint) {
    return { surface: hint, reason: "fallback_recommended_surface_hint" };
  }

  const finalSurface = normalizeSurface(decision.finalSurface);
  if (finalSurface) {
    return { surface: finalSurface, reason: "fallback_final_surface" };
  }

  return { surface: DEFAULT_FALLBACK_SURFACE, reason: "fallback_default_dock" };
}

function buildLookup<T extends { opportunityId: string }>(
  entries: readonly T[],
  readSurface: (entry: T) => string | null | undefined
): Map<string, string | null> {
  const lookup = new Map<string, string | null>();
  for (const entry of entries) {
    lookup.set(entry.opportunityId, readSurface(entry) ?? null);
  }
  return lookup;
}

function sortDecisions(decisions: readonly SurfaceTruthDecision[]): SurfaceTruthDecision[] {
  return [...decisions].sort((left, right) => left.opportunityId.localeCompare(right.opportunityId));
}

/** SurfaceTruthUnifier v1 — single authoritative surface map across pipeline layers. */
export function unifySurfaceTruth(input: UnifySurfaceTruthInput): UnifySurfaceTruthResult {
  const { decisions, routerOutputs, renderInputs } = input;
  const unifiedSurfaceMap = emptySurfaceMap();
  const conflictsResolved: ConflictResolution[] = [];
  const ignoredRouter: string[] = [];
  const ignoredRender: string[] = [];
  const assigned = new Set<string>();

  const routerLookup = buildLookup(routerOutputs, (entry) => entry.routedSurface);
  const renderLookup = buildLookup(renderInputs, (entry) => entry.renderSurface);

  for (const decision of sortDecisions(decisions)) {
    if (decision.visible === false) {
      continue;
    }

    if (assigned.has(decision.opportunityId)) {
      continue;
    }

    const { surface, reason } = resolveAuthoritativeSurface(decision);
    const conflictSources: string[] = [];
    const selectedSurface = surface;

    const routerSurface = normalizeSurface(routerLookup.get(decision.opportunityId) ?? undefined);
    if (routerSurface && routerSurface !== selectedSurface) {
      conflictSources.push("SurfaceRouter");
      ignoredRouter.push(decision.opportunityId);
    }

    const renderSurface = normalizeSurface(renderLookup.get(decision.opportunityId) ?? undefined);
    if (renderSurface && renderSurface !== selectedSurface) {
      conflictSources.push("SurfaceRender");
      ignoredRender.push(decision.opportunityId);
    }

    if (conflictSources.length > 0) {
      conflictsResolved.push({
        opportunityId: decision.opportunityId,
        selectedSurface,
        conflictSources: [...conflictSources].sort((left, right) => left.localeCompare(right)),
        resolutionReason: reason,
      });
    }

    unifiedSurfaceMap[selectedSurface].push(decision.opportunityId);
    assigned.add(decision.opportunityId);
  }

  for (const surface of VALID_SURFACES) {
    unifiedSurfaceMap[surface].sort((left, right) => left.localeCompare(right));
  }

  conflictsResolved.sort((left, right) => left.opportunityId.localeCompare(right.opportunityId));

  const ignoredSurfaces: IgnoredSurfaces = {
    SurfaceRouter: [...new Set(ignoredRouter)].sort((left, right) => left.localeCompare(right)),
    SurfaceRender: [...new Set(ignoredRender)].sort((left, right) => left.localeCompare(right)),
  };

  return {
    unifiedSurfaceMap,
    conflictsResolved,
    ignoredSurfaces,
  };
}

export function toSurfaceTruthDecisions(
  decisions: readonly VisibilityDecision[],
  opportunities: readonly ContextOpportunity[]
): SurfaceTruthDecision[] {
  const hintLookup = new Map(
    opportunities.map((opportunity) => [opportunity.id, opportunity.recommendedSurfaceHint])
  );

  return decisions.map((decision) => ({
    opportunityId: decision.opportunityId,
    visible: decision.visible,
    surface: decision.surface,
    recommendedSurfaceHint: hintLookup.get(decision.opportunityId) ?? "DOCK",
    finalSurface: decision.finalSurface,
  }));
}

export function toSurfaceRouterOutputs(surfaceRoute: SurfaceRouterResult): SurfaceRouterOutput[] {
  const outputs: SurfaceRouterOutput[] = [];

  for (const surface of VALID_SURFACES) {
    for (const opportunityId of surfaceRoute.surfaceMap[surface]) {
      outputs.push({
        opportunityId,
        routedSurface: surface,
      });
    }
  }

  outputs.sort((left, right) => left.opportunityId.localeCompare(right.opportunityId));
  return outputs;
}

export function toSurfaceRenderInputs(uiState: SurfaceUiState): SurfaceRenderInput[] {
  const inputs: SurfaceRenderInput[] = [];

  for (const surface of VALID_SURFACES) {
    for (const item of uiState[surface]) {
      inputs.push({
        opportunityId: item.id,
        renderSurface: surface,
      });
    }
  }

  inputs.sort((left, right) => left.opportunityId.localeCompare(right.opportunityId));
  return inputs;
}
