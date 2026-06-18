import { readLifeProjections } from "@/lib/life-read-model/read-life-projections";
import { readSurfaceDependencies } from "@/lib/life-read-model/read-surface-dependencies";
import type { SurfaceReadInput } from "@/lib/life-read-model/types";
import type {
  RankedSurface,
  SurfaceBuildContext,
  SurfaceEngineResult,
  SurfaceNarration,
} from "@/lib/surface-engine/surface-contract";
import { SURFACE_CONTRACT_VERSION } from "@/lib/surface-engine/surface-contract";
import { buildSurfacesFromLife } from "@/lib/surface-engine/surface-builder";
import { rankSurfaces } from "@/lib/surface-engine/surface-ranker";
import { routeSurfacesToChannels } from "@/lib/surface-engine/surface-router";
import { enforceSurfaceLaw } from "@/lib/surface-engine/surface-law";
import { stabilizeSurfaceLayer } from "@/lib/surface-engine/surface-stability";

export type ResolveSurfacesInput = SurfaceReadInput & {
  context?: SurfaceBuildContext;
};

/**
 * Full Surface Engine read frame: life → build → rank → law → route.
 */
export function resolveSurfaces(input: ResolveSurfacesInput = {}): SurfaceEngineResult {
  const now = input.context?.now ?? input.timelineContext?.now ?? new Date();
  const context: SurfaceBuildContext = {
    ...input.context,
    now,
    dateKey: input.dateKey ?? input.context?.dateKey,
  };

  const life = readLifeProjections({ dateKey: input.dateKey });
  const built = buildSurfacesFromLife(life, context);
  const { surfaces: stabilized, uxState } = stabilizeSurfaceLayer(built, { life, context });
  const ranked = rankSurfaces(stabilized);
  const lawful = ranked.map((surface) => enforceSurfaceLaw(surface));
  const withNarration = attachDependencyNarration(lawful, input);

  const routes = routeSurfacesToChannels(withNarration, {
    activeChannel: input.context?.focusedSurfaceId?.startsWith("chat")
      ? "CHAT"
      : undefined,
  });

  return {
    contractVersion: SURFACE_CONTRACT_VERSION,
    computedAt: now.toISOString(),
    surfaces: withNarration,
    routes,
    uxState,
  };
}

function attachDependencyNarration(
  surfaces: readonly RankedSurface[],
  input: ResolveSurfacesInput,
): RankedSurface[] {
  const deps = readSurfaceDependencies(input);
  if (deps.narrations.length === 0) {
    return [...surfaces];
  }

  const narrationByEc = new Map<string, SurfaceNarration>();
  for (const row of deps.narrations) {
    if (!row.ecId || narrationByEc.has(row.ecId)) {
      continue;
    }
    narrationByEc.set(row.ecId, {
      summary: row.explanation,
      reason: row.reason_tags[0],
    });
  }

  return surfaces.map((surface) => {
    const ecId = surface.events[0]?.eventId;
    const fromDeps = ecId ? narrationByEc.get(ecId) : undefined;
    if (!fromDeps) {
      return surface;
    }
    return {
      ...surface,
      narration: surface.narration ?? fromDeps,
    };
  });
}
