import type { LoopCandidate, LoopType } from "@/lib/loop-wiring/loop-contract";
import { LOOP_TYPES } from "@/lib/loop-wiring/loop-contract";

const LOOP_PRIORITY: Record<LoopType, number> = {
  INTERRUPTION_LOOP: 4,
  TRANSIT_LOOP: 3,
  MORNING_LOOP: 2,
  EVENING_LOOP: 1,
};

export type LoopPriorityResult = {
  activeLoop: LoopCandidate | null;
  ranked: readonly LoopCandidate[];
  suppressedLoops: readonly LoopType[];
};

/**
 * Multiple loops may trigger; exactly ONE becomes active (highest score × priority).
 */
export function selectActiveLoop(
  candidates: readonly LoopCandidate[],
  minConfidence = 0.35,
): LoopPriorityResult {
  const eligible = candidates.filter((row) => row.confidenceScore >= minConfidence);
  if (eligible.length === 0) {
    return { activeLoop: null, ranked: [], suppressedLoops: [...LOOP_TYPES] };
  }

  const ranked = [...eligible].sort((a, b) => {
    const scoreA = a.confidenceScore * LOOP_PRIORITY[a.loopType];
    const scoreB = b.confidenceScore * LOOP_PRIORITY[b.loopType];
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return b.timestamp.localeCompare(a.timestamp);
  });

  const activeLoop = ranked[0] ?? null;
  const suppressedLoops = LOOP_TYPES.filter((type) => type !== activeLoop?.loopType);

  return { activeLoop, ranked, suppressedLoops };
}
