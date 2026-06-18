import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";

export type WeightedHistoryTier = "primary" | "reference" | "hint";

export type WeightedHistoryLine = {
  turn: OrchestrateHistoryTurn;
  weight: number;
  tier: WeightedHistoryTier;
  age: number;
};

const DEFAULT_MAX_TURNS = 8;
const DEFAULT_LAMBDA = 0.65;

function tierForWeight(weight: number): WeightedHistoryTier {
  if (weight >= 0.68) {
    return "primary";
  }
  if (weight >= 0.32) {
    return "reference";
  }
  return "hint";
}

export function buildWeightedHistoryLines(
  history: readonly OrchestrateHistoryTurn[],
  options?: { maxTurns?: number; lambda?: number }
): WeightedHistoryLine[] {
  const maxTurns = options?.maxTurns ?? DEFAULT_MAX_TURNS;
  const lambda = options?.lambda ?? DEFAULT_LAMBDA;
  const turns = history.slice(-maxTurns);
  const count = turns.length;

  return turns.map((turn, index) => {
    const age = count - 1 - index;
    const weight = Math.exp(-lambda * age);
    return {
      turn,
      weight: Math.round(weight * 100) / 100,
      tier: tierForWeight(weight),
      age,
    };
  });
}

/** Temporal-weighted history block for LLM — recent turns dominate. */
export function formatWeightedHistoryBlock(
  history: readonly OrchestrateHistoryTurn[],
  options?: { maxTurns?: number; lambda?: number }
): string {
  const lines = buildWeightedHistoryLines(history, options);
  if (lines.length === 0) {
    return "";
  }

  return lines
    .map(
      (line) =>
        `[${line.tier}|w=${line.weight.toFixed(2)}] ${line.turn.role}: ${line.turn.content}`
    )
    .join("\n");
}
