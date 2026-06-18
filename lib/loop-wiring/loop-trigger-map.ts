import type {
  LoopCandidate,
  LoopContextSnapshot,
  LoopType,
  TriggerSignal,
} from "@/lib/loop-wiring/loop-contract";
import { LOOP_TYPES } from "@/lib/loop-wiring/loop-contract";
import { getSignalDefinition } from "@/lib/loop-wiring/signal-registry";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function isMorningHour(hour: number): boolean {
  return hour >= 6 && hour < 10;
}

/** Commute/calendar reinforce transit except during pure morning window without movement. */
function allowsTransitMapping(
  signal: TriggerSignal,
  contextSnapshot: LoopContextSnapshot,
): boolean {
  if (signal.kind === "navigate_intent" || signal.kind === "map_search") {
    return true;
  }
  if (signal.reinforcementOnly && signal.kind === "gps_movement") {
    return true;
  }
  if (!isMorningHour(contextSnapshot.hour)) {
    return true;
  }
  return false;
}

/**
 * One TriggerSignal → one LoopCandidate (per mapped loop type).
 * Reinforcement-only signals attach to existing types; never spawn alone.
 */
export function signalToLoopCandidates(
  signal: TriggerSignal,
  contextSnapshot: LoopContextSnapshot,
  existingTypes: ReadonlySet<LoopType>,
): LoopCandidate[] {
  const def = getSignalDefinition(signal.kind);
  const candidates: LoopCandidate[] = [];

  for (const loopType of def.loopTypes) {
    if (loopType === "TRANSIT_LOOP" && !allowsTransitMapping(signal, contextSnapshot)) {
      continue;
    }
    if (signal.reinforcementOnly && !existingTypes.has(loopType)) {
      continue;
    }
    const confidence = clamp01(
      signal.reinforcementOnly ? signal.strength * 0.45 : signal.strength,
    );
    if (confidence <= 0) {
      continue;
    }
    candidates.push({
      loopType,
      confidenceScore: confidence,
      triggerSignals: [signal],
      timestamp: signal.timestamp,
      contextSnapshot,
    });
  }

  return candidates;
}

/** Merge candidates by loop type — probabilistic aggregate. */
export function mergeLoopCandidates(
  candidates: readonly LoopCandidate[],
): LoopCandidate[] {
  const byType = new Map<LoopType, LoopCandidate>();

  for (const row of candidates) {
    const existing = byType.get(row.loopType);
    if (!existing) {
      byType.set(row.loopType, {
        ...row,
        triggerSignals: [...row.triggerSignals],
      });
      continue;
    }
    const mergedStrength = clamp01(
      1 - (1 - existing.confidenceScore) * (1 - row.confidenceScore),
    );
    byType.set(row.loopType, {
      loopType: row.loopType,
      confidenceScore: mergedStrength,
      triggerSignals: [...existing.triggerSignals, ...row.triggerSignals],
      timestamp:
        row.timestamp > existing.timestamp ? row.timestamp : existing.timestamp,
      contextSnapshot: row.contextSnapshot,
    });
  }

  return LOOP_TYPES.filter((type) => byType.has(type)).map((type) => byType.get(type)!);
}
