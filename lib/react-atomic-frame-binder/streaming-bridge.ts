import type { StreamingTickResult } from "@/lib/cognitive-streaming-cycle/types";
import type { CognitiveFrame } from "@/lib/react-atomic-frame-binder/types";

export function streamingTickToFrame(tick: StreamingTickResult, timestamp?: number): CognitiveFrame {
  return {
    tickId: tick.tickId,
    uiState: tick.uiState,
    frameDiff: tick.frameDiff,
    timestamp: timestamp ?? Date.now(),
    uiCommit: tick.uiCommit,
  };
}
