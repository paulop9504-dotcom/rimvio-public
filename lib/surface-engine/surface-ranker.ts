import type { RankedSurface, Surface } from "@/lib/surface-engine/surface-contract";
import { bandFromScore } from "@/lib/surface-engine/surface-priority";

/**
 * Deterministic surface ordering — no AI / LLM / embeddings.
 */
export function rankSurfaces(surfaces: readonly Surface[]): RankedSurface[] {
  const ranked = surfaces
    .filter((surface) => surface.visibility !== "hidden")
    .map((surface) => {
      const score = surface.priority.surfacePriorityScore;
      return {
        ...surface,
        priority: {
          ...surface.priority,
          surfacePriorityScore: score,
          band: bandFromScore(score),
        },
      };
    });

  return ranked.sort(compareRankedSurfaces);
}

function compareRankedSurfaces(left: RankedSurface, right: RankedSurface): number {
  const scoreDelta = right.priority.surfacePriorityScore - left.priority.surfacePriorityScore;
  if (scoreDelta !== 0) {
    return scoreDelta;
  }
  const leftStart = left.events[0]?.startAt ?? "";
  const rightStart = right.events[0]?.startAt ?? "";
  if (leftStart && rightStart && leftStart !== rightStart) {
    return leftStart.localeCompare(rightStart);
  }
  return left.id.localeCompare(right.id);
}
