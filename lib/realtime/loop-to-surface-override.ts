import type { LoopCandidate, LoopType } from "@/lib/loop-wiring/loop-contract";
import type { RankedSurface, SurfaceEngineResult } from "@/lib/surface-engine/surface-contract";
import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import {
  composeSurfaceFrame,
  surfaceCompositionFrameKey,
} from "@/lib/surface-composition/compose-surface-frame";
import type { RealtimeSurfaceFrame } from "@/lib/realtime/realtime-contract";
import type { RealtimeState } from "@/lib/realtime/realtime-contract";

const LOOP_SURFACE_BIAS: Record<
  LoopType,
  { types: readonly RankedSurface["type"][]; capabilities: readonly CapabilityId[]; boost: number }
> = {
  MORNING_LOOP: {
    types: ["schedule", "reminder", "goal", "work"],
    capabilities: ["CALENDAR", "ALARM", "REMINDER"],
    boost: 0.22,
  },
  TRANSIT_LOOP: {
    types: ["travel"],
    capabilities: ["NAVIGATE", "MAP", "TAXI"],
    boost: 0.28,
  },
  INTERRUPTION_LOOP: {
    types: ["reminder", "schedule"],
    capabilities: ["MESSAGE", "CALL", "ALARM"],
    boost: 0.24,
  },
  EVENING_LOOP: {
    types: ["food", "social", "generic"],
    capabilities: ["MESSAGE", "SEARCH"],
    boost: 0.2,
  },
};

function matchesBias(
  surface: RankedSurface,
  types: readonly RankedSurface["type"][],
  capabilities: readonly CapabilityId[],
): boolean {
  if (types.includes(surface.type)) {
    return true;
  }
  if (capabilities.includes(surface.primaryAction.capabilityId)) {
    return true;
  }
  return surface.secondaryActions.some((action) =>
    capabilities.includes(action.capabilityId),
  );
}

/**
 * Loop bias → re-ranked channel surfaces (single dominant context).
 */
export function applyLoopSurfaceBias(
  channelSurfaces: readonly RankedSurface[],
  activeLoop: LoopCandidate | null,
): readonly RankedSurface[] {
  if (!activeLoop) {
    return channelSurfaces;
  }
  const bias = LOOP_SURFACE_BIAS[activeLoop.loopType];
  const penalizedTypes =
    activeLoop.loopType === "EVENING_LOOP"
      ? new Set<RankedSurface["type"]>(["travel"])
      : activeLoop.loopType === "TRANSIT_LOOP"
        ? new Set<RankedSurface["type"]>(["food", "goal"])
        : null;

  return [...channelSurfaces]
    .map((surface) => {
      let score = surface.priority.surfacePriorityScore;
      if (matchesBias(surface, bias.types, bias.capabilities)) {
        score += bias.boost;
      }
      if (penalizedTypes?.has(surface.type)) {
        score -= 0.15;
      }
      return {
        ...surface,
        priority: {
          ...surface.priority,
          surfacePriorityScore: Math.round(score * 1000) / 1000,
        },
      };
    })
    .sort((a, b) => b.priority.surfacePriorityScore - a.priority.surfacePriorityScore);
}

export type LoopSurfaceOverrideResult = {
  surfaces: readonly RankedSurface[];
  overrideKey: string;
  primarySurfaceId: string | null;
};

/** Recompute graph with loop bias — stops implicit batch by returning fresh frame key. */
export function applyLoopSurfaceOverride(
  engine: SurfaceEngineResult,
  channelSurfaces: readonly RankedSurface[],
  activeLoop: LoopCandidate | null,
): LoopSurfaceOverrideResult {
  const surfaces = applyLoopSurfaceBias(channelSurfaces, activeLoop);
  const primarySurfaceId = surfaces[0]?.id ?? null;
  const frame = composeSurfaceFrame(engine, surfaces);
  const overrideKey = `${surfaceCompositionFrameKey(frame)}:loop:${activeLoop?.loopType ?? "none"}`;
  return { surfaces, overrideKey, primarySurfaceId };
}

export function buildRealtimeSurfaceFrame(
  engine: SurfaceEngineResult,
  channelSurfaces: readonly RankedSurface[],
  realtime: RealtimeState,
): RealtimeSurfaceFrame {
  const override = applyLoopSurfaceOverride(
    engine,
    channelSurfaces,
    realtime.activeLoop,
  );
  const composition = composeSurfaceFrame(engine, override.surfaces);
  return {
    realtime: {
      ...realtime,
      surfaceOverrideKey: override.overrideKey,
    },
    composition,
    overrideApplied: Boolean(realtime.activeLoop),
    dominantLoop: realtime.activeLoop?.loopType ?? null,
  };
}
