import type { LoopWiringResult } from "@/lib/loop-wiring/loop-contract";
import { LOOP_WIRING_CONTRACT_VERSION } from "@/lib/loop-wiring/loop-contract";
import {
  buildContextSnapshot,
  collectTriggerSignals,
} from "@/lib/loop-wiring/collect-signals";
import type { LoopWiringInput } from "@/lib/loop-wiring/loop-wiring-input";
import {
  mergeLoopCandidates,
  signalToLoopCandidates,
} from "@/lib/loop-wiring/loop-trigger-map";
import { selectActiveLoop } from "@/lib/loop-wiring/loop-priority-engine";
import { assertNoOrphanSignalKinds } from "@/lib/loop-wiring/signal-registry";
import { commitLoopWiringFrame } from "@/lib/loop-wiring/loop-wiring-store";

/**
 * Full wiring frame: signals → candidates → priority → one active loop.
 * No manual activation path exists in this module.
 */
export function wireKillerLoops(input: LoopWiringInput = {}): LoopWiringResult {
  const now = input.now ?? new Date();
  const signals = collectTriggerSignals({ ...input, now });
  assertNoOrphanSignalKinds(signals.map((row) => row.kind));

  const contextSnapshot = buildContextSnapshot(input, now);

  const primarySignals = signals.filter((row) => !row.reinforcementOnly);
  const primaryTypes = new Set(
    primarySignals.flatMap((signal) =>
      signalToLoopCandidates(signal, contextSnapshot, new Set()).map(
        (candidate) => candidate.loopType,
      ),
    ),
  );

  const rawCandidates = signals.flatMap((signal) =>
    signalToLoopCandidates(signal, contextSnapshot, primaryTypes),
  );

  const candidates = mergeLoopCandidates(rawCandidates);
  const priority = selectActiveLoop(candidates);

  const frame = {
    contractVersion: LOOP_WIRING_CONTRACT_VERSION,
    computedAt: now.toISOString(),
    candidates,
    activeLoop: priority.activeLoop,
    suppressedLoops: priority.suppressedLoops,
  };
  commitLoopWiringFrame(frame);
  return frame;
}

/** Ingest execution-plane capability as behavior signal (event-driven). */
export function wireLoopFromCapabilityExecution(input: {
  capabilityId: string;
  executedAt?: string;
  wiring?: LoopWiringInput;
}): LoopWiringResult {
  const now = input.executedAt ? new Date(input.executedAt) : new Date();
  const caps = [
    ...(input.wiring?.recentCapabilityIds ?? []),
    input.capabilityId as import("@/lib/capability-registry/capability-types").CapabilityId,
  ];
  return wireKillerLoops({
    ...input.wiring,
    now,
    recentCapabilityIds: caps,
  });
}
