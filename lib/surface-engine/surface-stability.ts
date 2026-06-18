import type { LifeProjections } from "@/lib/life-read-model/types";
import type {
  RankedSurface,
  Surface,
  SurfaceBuildContext,
} from "@/lib/surface-engine/surface-contract";
import { assertPrimaryAction, capProminentSurfaces } from "@/lib/surface-engine/surface-law";
import {
  buildIdleStarterSurface,
  buildStartHereSurface,
  hasStartHereSurface,
} from "@/lib/surface-engine/surface-fallback";
import { bandFromScore } from "@/lib/surface-engine/surface-priority";
import {
  countVisibleSurfaces,
  detectSurfaceUxState,
  isFallbackSurface,
  isLowSignalSurface,
  UX_MAX_TOP_SURFACES,
  type SurfaceUxState,
} from "@/lib/surface-engine/surface-ux-state";

export type SurfaceStabilityResult = {
  surfaces: RankedSurface[];
  uxState: SurfaceUxState;
};

export type StabilizeSurfaceInput = {
  life: LifeProjections;
  context?: SurfaceBuildContext;
};

function asRanked(surface: Surface): RankedSurface {
  const score = surface.priority.surfacePriorityScore;
  return {
    ...surface,
    priority: {
      ...surface.priority,
      surfacePriorityScore: score,
      band: surface.priority.band ?? bandFromScore(score),
    },
  };
}

/** Collapse competing high-priority surfaces — one clear direction. */
export function resolveSignalConflicts(surfaces: RankedSurface[]): RankedSurface[] {
  const sorted = [...surfaces].sort(
    (a, b) => b.priority.surfacePriorityScore - a.priority.surfacePriorityScore,
  );
  const contenders = sorted.filter(
    (row) =>
      row.visibility !== "hidden" &&
      !isFallbackSurface(row) &&
      (row.priority.band === "critical" || row.priority.band === "high"),
  );

  if (contenders.length <= 1) {
    return surfaces;
  }

  const winnerId = contenders[0]!.id;
  return surfaces.map((row) => {
    if (row.id === winnerId || row.visibility === "hidden" || isFallbackSurface(row)) {
      return row;
    }
    if (!contenders.some((c) => c.id === row.id)) {
      return row;
    }
    const demotedScore = Math.min(row.priority.surfacePriorityScore, 34);
    return {
      ...row,
      visibility: row.visibility === "prominent" ? "normal" : row.visibility,
      priority: {
        ...row.priority,
        surfacePriorityScore: demotedScore,
        band: bandFromScore(demotedScore),
      },
      narration: row.narration ?? {
        summary: "지금은 다른 일정을 먼저 보는 게 좋아요",
        reason: "conflict_resolution",
      },
    };
  });
}

/** Merge weak fragmented signals into one dominant hypothesis. */
export function mergeLowSignalSurfaces(surfaces: RankedSurface[]): RankedSurface[] {
  const low = surfaces.filter((row) => isLowSignalSurface(row));
  if (low.length < 2) {
    return surfaces;
  }

  const travelGroup = low.filter((row) => row.type === "travel");
  if (travelGroup.length < 2) {
    return surfaces;
  }

  const dominant = [...travelGroup].sort(
    (a, b) => b.priority.surfacePriorityScore - a.priority.surfacePriorityScore,
  )[0]!;
  const mergedTitles = travelGroup.map((row) => row.title).join(" · ");
  const mergedIds = new Set(travelGroup.map((row) => row.id));

  const boostedScore = Math.max(dominant.priority.surfacePriorityScore, 58);
  const merged: RankedSurface = {
    ...dominant,
    title: dominant.title.includes("여행") ? dominant.title : `${mergedTitles} 여행`,
    description: "여행 준비를 한 흐름으로 이어가면 돼요",
    narration: {
      summary: "항공, 숙소, 체크리스트를 순서대로 진행하면 돼요",
      reason: "low_signal_merge",
    },
    priority: {
      ...dominant.priority,
      surfacePriorityScore: boostedScore,
      band: bandFromScore(boostedScore),
    },
    visibility: "prominent",
  };

  return [
    merged,
    ...surfaces
      .filter((row) => !mergedIds.has(row.id))
      .map((row) =>
        travelGroup.some((t) => t.id === row.id)
          ? { ...row, visibility: "hidden" as const }
          : row,
      ),
  ];
}

/** Overloaded → keep top N; demote rest (never delete — learning may not create empty). */
export function collapseOverloadedSurfaces(surfaces: RankedSurface[]): RankedSurface[] {
  const visible = surfaces.filter((row) => row.visibility !== "hidden");
  if (visible.length <= UX_MAX_TOP_SURFACES) {
    return surfaces;
  }

  const ranked = [...visible].sort(
    (a, b) => b.priority.surfacePriorityScore - a.priority.surfacePriorityScore,
  );
  const keepIds = new Set(ranked.slice(0, UX_MAX_TOP_SURFACES).map((row) => row.id));

  return surfaces.map((row) => {
    if (isFallbackSurface(row) || keepIds.has(row.id) || row.visibility === "hidden") {
      return row;
    }
    return {
      ...row,
      visibility: "muted" as const,
      priority: {
        ...row.priority,
        surfacePriorityScore: Math.min(row.priority.surfacePriorityScore, 20),
        band: "low" as const,
      },
    };
  });
}

function ensurePrimaryAction(surface: RankedSurface): RankedSurface {
  assertPrimaryAction(surface);
  if (surface.secondaryActions.some((action) => action.kind === "primary")) {
    return {
      ...surface,
      secondaryActions: surface.secondaryActions.map((action) =>
        action.kind === "primary" ? { ...action, kind: "secondary" as const } : action,
      ),
    };
  }
  return surface;
}

function injectFallbacks(
  surfaces: RankedSurface[],
  uxState: SurfaceUxState,
  now: Date,
  context: SurfaceBuildContext,
): RankedSurface[] {
  const out = [...surfaces];

  if (uxState === "idle" && !out.some((row) => row.id.includes(":idle"))) {
    out.unshift(buildIdleStarterSurface(now, context));
  }

  if (!hasStartHereSurface(out) && (uxState === "empty" || countVisibleSurfaces(out) === 0)) {
    out.unshift(buildStartHereSurface(now, uxState));
  }

  if (out.length === 0) {
    out.push(buildStartHereSurface(now, uxState));
  }

  if (countVisibleSurfaces(out) === 0) {
    out.push(buildStartHereSurface(now, uxState));
  }

  return out;
}

/**
 * UX stability pass — guarantees ≥1 usable surface, caps overload, merges weak signals.
 * Runs after build; learning weights already applied in priority scores.
 */
export function stabilizeSurfaceLayer(
  surfaces: readonly Surface[],
  input: StabilizeSurfaceInput,
): SurfaceStabilityResult {
  const context = input.context ?? {};
  const now = context.now ?? new Date();

  let working = surfaces.map(asRanked).map(ensurePrimaryAction);
  let uxState = detectSurfaceUxState(working, input.life, context);

  if (uxState === "low_signal") {
    working = mergeLowSignalSurfaces(working);
    uxState = detectSurfaceUxState(working, input.life, context);
  }

  if (uxState === "overloaded") {
    working = collapseOverloadedSurfaces(working);
  }

  working = resolveSignalConflicts(working);
  working = injectFallbacks(working, uxState, now, context);
  working = capProminentSurfaces(working);

  uxState = detectSurfaceUxState(working, input.life, context);

  assertStabilityInvariants(working);

  return { surfaces: working, uxState };
}

/** Hard UX guarantees for tests and runtime. */
export function assertStabilityInvariants(surfaces: readonly RankedSurface[]): void {
  if (surfaces.length < 1) {
    throw new Error("Surface stability invariant failed: surfaces.length < 1");
  }
  if (countVisibleSurfaces(surfaces) < 1) {
    throw new Error("Surface stability invariant failed: no visible surface");
  }
  for (const surface of surfaces) {
    if (surface.primaryAction.kind !== "primary") {
      throw new Error(`Surface ${surface.id} must have exactly one primary action`);
    }
    const primarySecondaries = surface.secondaryActions.filter((a) => a.kind === "primary");
    if (primarySecondaries.length > 0) {
      throw new Error(`Surface ${surface.id} has multiple primary actions`);
    }
  }
}
