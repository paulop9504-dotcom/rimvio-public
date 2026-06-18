import type { StreamSignal } from "@/lib/realtime/realtime-contract";
import type { LoopWiringInput } from "@/lib/loop-wiring/loop-wiring-input";
import { processStableRealtimeTick } from "@/lib/stability/stability-pipeline";
import type { RealtimeState } from "@/lib/realtime/realtime-contract";

export type ReplayStep = {
  atMs: number;
  signals: readonly StreamSignal[];
  wiring?: LoopWiringInput;
};

/**
 * Deterministic replay — fixed clock steps, no randomness.
 */
export function replayStabilityStream(
  steps: readonly ReplayStep[],
  seedState: RealtimeState | null = null,
): readonly RealtimeState[] {
  const frames: RealtimeState[] = [];
  let previous = seedState;

  for (const step of steps) {
    const tick = processStableRealtimeTick({
      streamSignals: step.signals,
      wiring: step.wiring,
      now: new Date(step.atMs),
      previous,
    });
    frames.push(tick.state);
    previous = tick.state;
  }

  return frames;
}
