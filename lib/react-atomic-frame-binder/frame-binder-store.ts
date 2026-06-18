import { applyFrameDiff, cloneSurfaceUiState, shouldApplyFrame } from "@/lib/react-atomic-frame-binder/apply-frame-diff";
import {
  createEmptyCommittedSnapshot,
  type CognitiveFrame,
  type CommittedFrameSnapshot,
} from "@/lib/react-atomic-frame-binder/types";

export type FrameBinderState = CommittedFrameSnapshot & {
  revision: number;
  skippedTicks: number;
};

export function createFrameBinderState(timestamp: number = 0): FrameBinderState {
  return {
    ...createEmptyCommittedSnapshot(timestamp),
    revision: 0,
    skippedTicks: 0,
  };
}

/** Pure commit gate — returns next binder state without mutating input. */
export function bindCommittedFrame(
  state: FrameBinderState,
  frame: CognitiveFrame
): FrameBinderState {
  if (!shouldApplyFrame(frame)) {
    return {
      ...state,
      skippedTicks: state.skippedTicks + 1,
    };
  }

  const nextUiState = applyFrameDiff(state.uiState, frame.uiState, frame.frameDiff);

  return {
    tickId: frame.tickId,
    uiState: nextUiState,
    timestamp: frame.timestamp,
    revision: state.revision + 1,
    skippedTicks: state.skippedTicks,
  };
}

/** First committed frame when previous snapshot is empty. */
export function bindInitialFrame(
  frame: CognitiveFrame
): FrameBinderState | null {
  if (!frame.uiCommit) {
    return null;
  }

  return {
    tickId: frame.tickId,
    uiState: cloneSurfaceUiState(frame.uiState),
    timestamp: frame.timestamp,
    revision: 1,
    skippedTicks: 0,
  };
}

export function ingestFrame(
  state: FrameBinderState,
  frame: CognitiveFrame
): FrameBinderState {
  if (state.revision === 0 && state.tickId == null) {
    const initial = bindInitialFrame(frame);
    if (initial) {
      return initial;
    }
    return {
      ...state,
      skippedTicks: state.skippedTicks + 1,
    };
  }

  return bindCommittedFrame(state, frame);
}
