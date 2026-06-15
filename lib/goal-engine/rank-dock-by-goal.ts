import { mapDockActionToGoalAlignable } from "@/lib/goal-engine/map-dock-action-to-goal";
import { scoreActionAlignment } from "@/lib/goal-engine/score-action-alignment";
import type { GoalSnapshot } from "@/lib/goal-engine/types";
import type { PredictiveDockAction, PredictiveDockWire } from "@/lib/predictive-dock/types";

const DOCK_SCORE_WEIGHT = 0.7;
const ALIGNMENT_SCORE_WEIGHT = 0.3;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeDockScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0.5;
  }
  if (score <= 1) {
    return clamp01(score);
  }
  return clamp01(score / 100);
}

/** Hook C — blend dock confidence with constitution alignment (alignment never fully overrides). */
export function combineDockGoalScores(
  dockScore: number,
  alignmentScore: number,
): number {
  const dockNorm = normalizeDockScore(dockScore);
  return dockNorm * DOCK_SCORE_WEIGHT + clamp01(alignmentScore) * ALIGNMENT_SCORE_WEIGHT;
}

type RankedDockEntry = {
  action: PredictiveDockAction;
  originalIndex: number;
  originalDockScore: number;
  finalScore: number;
  alignmentScore: number;
};

function rankDockPool(
  actions: PredictiveDockAction[],
  snapshot: GoalSnapshot,
): PredictiveDockAction[] {
  const ranked: RankedDockEntry[] = actions.map((action, originalIndex) => {
    const alignment = scoreActionAlignment(
      mapDockActionToGoalAlignable(action),
      snapshot,
    );
    const originalDockScore = action.score;
    const finalScore = combineDockGoalScores(originalDockScore, alignment.score);
    return {
      action,
      originalIndex,
      originalDockScore,
      finalScore,
      alignmentScore: alignment.score,
    };
  });

  ranked.sort((left, right) => {
    if (right.finalScore !== left.finalScore) {
      return right.finalScore - left.finalScore;
    }
    if (right.originalDockScore !== left.originalDockScore) {
      return right.originalDockScore - left.originalDockScore;
    }
    return left.originalIndex - right.originalIndex;
  });

  const devDetail = process.env.NODE_ENV === "development";

  return ranked.map((entry, index) => {
    const base: PredictiveDockAction = {
      ...entry.action,
      goalAligned: index === 0,
    };
    if (index === 0) {
      return {
        ...base,
        goal_alignment_score: entry.alignmentScore,
      };
    }
    if (devDetail) {
      return {
        ...base,
        goal_alignment_score: entry.alignmentScore,
      };
    }
    return base;
  });
}

/**
 * Client dock hook — re-sorts by goal alignment; does not rebuild snapshot.
 * Never removes or adds actions — order + metadata only.
 */
export function rankPredictiveDockByGoal(
  wire: PredictiveDockWire,
  snapshot: GoalSnapshot,
): PredictiveDockWire {
  const pool: PredictiveDockAction[] = [
    ...(wire.main_action ? [wire.main_action] : []),
    ...wire.shadow_actions,
  ];
  if (pool.length === 0) {
    return wire;
  }

  const ranked = rankDockPool(pool, snapshot);
  return {
    main_action: ranked[0] ?? null,
    shadow_actions: ranked.slice(1),
  };
}
