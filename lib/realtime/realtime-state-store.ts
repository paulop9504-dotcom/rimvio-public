import type { RealtimeState } from "@/lib/realtime/realtime-contract";

let lastFrame: RealtimeState | null = null;

/** Hot read — no mutation. */
export function readRealtimeState(): RealtimeState | null {
  return lastFrame;
}

export function commitRealtimeState(frame: RealtimeState): void {
  lastFrame = frame;
}

export function resetRealtimeStateStoreForTests(): void {
  lastFrame = null;
}
