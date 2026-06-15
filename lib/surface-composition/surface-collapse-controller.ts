import type { RankedSurface, SurfaceUxState } from "@/lib/surface-engine/surface-contract";
import { isFallbackSurface } from "@/lib/surface-engine/surface-ux-state";
import { expandSynapse } from "@/lib/synaptic/synapse-engine";

export type SurfaceTransitionKind =
  | "ACTIVE_SELECTED"
  | "ACTIVE_TO_LATENT"
  | "LATENT_TO_ACTIVE"
  | "COLLAPSED_LIST";

export type SurfaceTransitionEvent = {
  kind: SurfaceTransitionKind;
  activeSurfaceId: string | null;
  previousActiveSurfaceId?: string | null;
  latentSurfaceIds: readonly string[];
  at: string;
  reason?: string;
};

export type SurfaceCollapseResult = {
  activeSurface: RankedSurface | null;
  latentSurfaces: readonly RankedSurface[];
  /** Full ranked visible list before collapse (debug). */
  rankedCandidates: readonly RankedSurface[];
  selectionScore: number;
  transition: SurfaceTransitionEvent | null;
};

let lastActiveSurfaceId: string | null = null;

function logCollapse(tag: string, payload: unknown): void {
  if (typeof console !== "undefined") {
    console.debug(`[Rimvio] ${tag}`, payload);
  }
}

function scoreSurface(surface: RankedSurface): number {
  return surface.priority.surfacePriorityScore;
}

function rankVisibleCandidates(candidates: readonly RankedSurface[]): RankedSurface[] {
  return [...candidates]
    .filter((row) => row.visibility !== "hidden")
    .sort((a, b) => {
      const scoreDelta = scoreSurface(b) - scoreSurface(a);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return a.id.localeCompare(b.id);
    });
}

function buildTransitionEvent(input: {
  active: RankedSurface | null;
  latent: readonly RankedSurface[];
  previousActiveId: string | null;
  reason?: string;
}): SurfaceTransitionEvent {
  const at = new Date().toISOString();
  const activeId = input.active?.id ?? null;
  const latentIds = input.latent.map((row) => row.id);

  let kind: SurfaceTransitionKind = "COLLAPSED_LIST";
  if (activeId && input.previousActiveId && activeId !== input.previousActiveId) {
    kind = "LATENT_TO_ACTIVE";
  } else if (activeId && !input.previousActiveId) {
    kind = "ACTIVE_SELECTED";
  } else if (!activeId && input.previousActiveId) {
    kind = "ACTIVE_TO_LATENT";
  } else if (input.previousActiveId && activeId === input.previousActiveId) {
    kind = "COLLAPSED_LIST";
  } else if (activeId) {
    kind = "ACTIVE_SELECTED";
  }

  return {
    kind,
    activeSurfaceId: activeId,
    previousActiveSurfaceId: input.previousActiveId,
    latentSurfaceIds: latentIds,
    at,
    reason: input.reason,
  };
}

/**
 * Collapse all surface candidates into one ACTIVE + latent queue (not rendered).
 * Selection: argmax(surfacePriorityScore).
 */
export function collapseSurfaceDecisionStream(
  candidates: readonly RankedSurface[],
  context: { uxState?: SurfaceUxState; reason?: string } = {},
): SurfaceCollapseResult {
  const ranked = rankVisibleCandidates(candidates);
  const activeSurface = ranked[0] ?? null;
  const latentSurfaces = ranked.slice(1);
  const selectionScore = activeSurface ? scoreSurface(activeSurface) : 0;
  const previousActiveId = lastActiveSurfaceId;

  const transition = buildTransitionEvent({
    active: activeSurface,
    latent: latentSurfaces,
    previousActiveId,
    reason: context.reason ?? context.uxState,
  });

  if (activeSurface) {
    if (previousActiveId !== activeSurface.id) {
      if (previousActiveId) {
        logCollapse("SURFACE_TRANSITION_EVENT", {
          ...transition,
          note: "active_replaced",
        });
      }
      logCollapse("SURFACE_ACTIVE_SELECTED", {
        activeSurfaceId: activeSurface.id,
        selectionScore,
        uxState: context.uxState,
        primaryCapabilityId: activeSurface.primaryAction.capabilityId,
      });
      expandSynapse({
        surfaceId: activeSurface.id,
        capabilityId: activeSurface.primaryAction.capabilityId,
        reason: "active_surface_selected",
      });
    }
  } else if (previousActiveId) {
    logCollapse("SURFACE_TRANSITION_EVENT", transition);
  }

  logCollapse("SURFACE_COLLAPSED_LIST", {
    activeSurfaceId: activeSurface?.id ?? null,
    latentSurfaceIds: latentSurfaces.map((row) => row.id),
    latentCount: latentSurfaces.length,
    selectionScore,
  });

  lastActiveSurfaceId = activeSurface?.id ?? null;

  return {
    activeSurface,
    latentSurfaces,
    rankedCandidates: ranked,
    selectionScore,
    transition,
  };
}

/** True when a real (non-fallback) primary should drive the feed decision stream. */
export function hasActiveDecisionStream(input: {
  primary: { id: string; visibility?: string } | null;
}): boolean {
  if (!input.primary) {
    return false;
  }
  if (input.primary.visibility === "hidden") {
    return false;
  }
  return !isFallbackSurface(input.primary);
}

/** Latent layers (prep, dock) may render only when no active decision surface. */
export function shouldRenderLatentSuggestionLayers(frame: {
  layout: { primary: { id: string; visibility?: string } | null };
}): boolean {
  return !hasActiveDecisionStream(frame.layout);
}

export function resetSurfaceCollapseStateForTests(): void {
  lastActiveSurfaceId = null;
}
