import type { LoopWiringResult } from "@/lib/loop-wiring/loop-contract";

let lastFrame: LoopWiringResult | null = null;

/** Hot read model — rebuilt from signals, not SSOT. */
export function commitLoopWiringFrame(frame: LoopWiringResult): void {
  lastFrame = structuredClone(frame);
}

export function readLastLoopWiringFrame(): LoopWiringResult | null {
  return lastFrame;
}

export function resetLoopWiringStoreForTests(): void {
  lastFrame = null;
}
