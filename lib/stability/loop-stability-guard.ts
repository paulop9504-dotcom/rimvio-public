import type { LoopCandidate } from "@/lib/loop-wiring/loop-contract";
import { LOOP_TYPES, type LoopType } from "@/lib/loop-wiring/loop-contract";
import {
  DEFAULT_LOOP_STABILITY_CONFIG,
  type LoopStabilityConfig,
  type LoopSwitchRecord,
} from "@/lib/stability/stability-contract";

const LOOP_PRIORITY: Record<LoopType, number> = {
  INTERRUPTION_LOOP: 4,
  TRANSIT_LOOP: 3,
  MORNING_LOOP: 2,
  EVENING_LOOP: 1,
};

export type LoopGuardState = {
  lastSwitchAtMs: number | null;
  activeLoopType: LoopType | null;
  switchHistory: readonly LoopSwitchRecord[];
  loopCooldownUntil: Partial<Record<LoopType, number>>;
};

export type LoopStabilityGuardResult = {
  activeLoop: LoopCandidate | null;
  switched: boolean;
  loopStabilityScore: number;
  suppressedParallel: readonly LoopType[];
  blockedReason: "hold" | "hysteresis" | "cooldown" | "oscillation" | null;
};

export function createLoopGuardState(
  activeLoop: LoopCandidate | null = null,
  lastSwitchAtMs: number | null = null,
): LoopGuardState {
  return {
    lastSwitchAtMs,
    activeLoopType: activeLoop?.loopType ?? null,
    switchHistory: [],
    loopCooldownUntil: {},
  };
}

function loopScore(candidate: LoopCandidate | null): number {
  if (!candidate) {
    return 0;
  }
  return candidate.confidenceScore * LOOP_PRIORITY[candidate.loopType];
}

function detectOscillation(
  history: readonly LoopSwitchRecord[],
  proposed: LoopType,
  current: LoopType | null,
  nowMs: number,
  windowMs: number,
): boolean {
  if (!current) {
    return false;
  }
  const recent = history.filter((row) => nowMs - row.atMs <= windowMs);
  if (recent.length < 2) {
    return false;
  }
  const last = recent[recent.length - 1]!;
  const prev = recent[recent.length - 2]!;
  return last.to === current && prev.to === proposed && proposed !== current;
}

/**
 * Prevents loop thrashing, hysteresis flips, and per-type cooldown violations.
 */
export function applyLoopStabilityGuard(
  proposed: LoopCandidate | null,
  current: LoopCandidate | null,
  state: LoopGuardState,
  nowMs: number,
  config: LoopStabilityConfig = DEFAULT_LOOP_STABILITY_CONFIG,
): { result: LoopStabilityGuardResult; nextState: LoopGuardState } {
  const currentScore = loopScore(current);
  const proposedScore = loopScore(proposed);

  if (!proposed) {
    return {
      result: {
        activeLoop: current,
        switched: false,
        loopStabilityScore: currentScore,
        suppressedParallel: [...LOOP_TYPES],
        blockedReason: null,
      },
      nextState: state,
    };
  }

  const elapsed =
    state.lastSwitchAtMs === null ? Infinity : nowMs - state.lastSwitchAtMs;
  const sameType = current?.loopType === proposed.loopType;

  if (sameType && elapsed < config.minHoldMs) {
    return hold(current, currentScore, state, "hold");
  }

  if (
    current &&
    elapsed < config.minHoldMs &&
    proposedScore - currentScore < config.hysteresisDelta
  ) {
    return hold(current, currentScore, state, "hysteresis");
  }

  const cooldownUntil = state.loopCooldownUntil[proposed.loopType];
  if (cooldownUntil !== undefined && nowMs < cooldownUntil) {
    return hold(current, currentScore, state, "cooldown");
  }

  if (
    current &&
    detectOscillation(
      state.switchHistory,
      proposed.loopType,
      current.loopType,
      nowMs,
      config.oscillationWindowMs,
    )
  ) {
    return hold(current, currentScore, state, "oscillation");
  }

  const switched = current?.loopType !== proposed.loopType;
  let nextState: LoopGuardState = { ...state };

  if (switched) {
    const history: LoopSwitchRecord[] = [
      ...state.switchHistory,
      { from: current?.loopType ?? null, to: proposed.loopType, atMs: nowMs },
    ].slice(-8);
    const cooldownUntilMap = { ...state.loopCooldownUntil };
    if (current?.loopType) {
      cooldownUntilMap[current.loopType] = nowMs + config.loopCooldownMs;
    }
    nextState = {
      lastSwitchAtMs: nowMs,
      activeLoopType: proposed.loopType,
      switchHistory: history,
      loopCooldownUntil: cooldownUntilMap,
    };
  }

  return {
    result: {
      activeLoop: proposed,
      switched,
      loopStabilityScore: proposedScore,
      suppressedParallel: LOOP_TYPES.filter((type) => type !== proposed.loopType),
      blockedReason: null,
    },
    nextState,
  };
}

function hold(
  current: LoopCandidate | null,
  currentScore: number,
  state: LoopGuardState,
  blockedReason: LoopStabilityGuardResult["blockedReason"],
): { result: LoopStabilityGuardResult; nextState: LoopGuardState } {
  return {
    result: {
      activeLoop: current,
      switched: false,
      loopStabilityScore: currentScore,
      suppressedParallel: LOOP_TYPES.filter((type) => type !== current?.loopType),
      blockedReason,
    },
    nextState: state,
  };
}

/** Legacy single-shot guard (tests / thin callers). */
export function applyLoopStabilityGuardSimple(
  proposed: LoopCandidate | null,
  current: LoopCandidate | null,
  lastSwitchAtMs: number | null,
  nowMs: number,
  minHoldMs = DEFAULT_LOOP_STABILITY_CONFIG.minHoldMs,
  hysteresisDelta = DEFAULT_LOOP_STABILITY_CONFIG.hysteresisDelta,
): LoopStabilityGuardResult {
  const state = createLoopGuardState(current, lastSwitchAtMs);
  const { result } = applyLoopStabilityGuard(proposed, current, state, nowMs, {
    ...DEFAULT_LOOP_STABILITY_CONFIG,
    minHoldMs,
    hysteresisDelta,
  });
  return result;
}
