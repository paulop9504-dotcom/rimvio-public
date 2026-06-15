#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { applyFrameDiff, shouldApplyFrame } from "../lib/react-atomic-frame-binder/apply-frame-diff";
import {
  bindCommittedFrame,
  createFrameBinderState,
  ingestFrame,
} from "../lib/react-atomic-frame-binder/frame-binder-store";
import type { CognitiveFrame } from "../lib/react-atomic-frame-binder/types";
import { emptyUiState } from "../lib/cognitive-streaming-cycle/types";

const baseUiState = {
  CALENDAR: [
    {
      id: "opp:a:REMINDER",
      type: "REMINDER",
      title: "Dentist reminder",
      timestamp: 1_700_000_000_000,
      urgency: 0.8,
    },
  ],
  DOCK: [
    {
      id: "opp:b:SUGGESTION",
      type: "SUGGESTION",
      title: "Lunch",
      relevance: 0.4,
    },
  ],
  TIMELINE: [],
  NARRATION: [],
};

let state = createFrameBinderState();

const firstFrame: CognitiveFrame = {
  tickId: "tick-1",
  uiState: baseUiState,
  frameDiff: { added: ["opp:a:REMINDER", "opp:b:SUGGESTION"], removed: [], updated: [] },
  timestamp: 1_700_000_000_000,
  uiCommit: true,
};

state = ingestFrame(state, firstFrame);
assert.equal(state.revision, 1);
assert.equal(state.uiState.CALENDAR.length, 1);
assert.equal(state.uiState.DOCK.length, 1);

const skipped: CognitiveFrame = {
  tickId: "tick-2",
  uiState: baseUiState,
  frameDiff: { added: [], removed: [], updated: [] },
  timestamp: 1_700_000_001_000,
  uiCommit: false,
};

const afterSkip = ingestFrame(state, skipped);
assert.equal(afterSkip.revision, 1);
assert.equal(afterSkip.skippedTicks, 1);
assert.equal(afterSkip.uiState.CALENDAR[0]!.title, "Dentist reminder");

const updatedTarget = {
  ...baseUiState,
  CALENDAR: [
    {
      ...baseUiState.CALENDAR[0]!,
      title: "Dentist reminder updated",
    },
  ],
};

const updateFrame: CognitiveFrame = {
  tickId: "tick-3",
  uiState: updatedTarget,
  frameDiff: { added: [], removed: [], updated: ["opp:a:REMINDER"] },
  timestamp: 1_700_000_002_000,
  uiCommit: true,
};

state = ingestFrame(state, updateFrame);
assert.equal(state.uiState.CALENDAR[0]!.title, "Dentist reminder updated");
assert.equal(state.uiState.DOCK.length, 1);

const removeFrame: CognitiveFrame = {
  tickId: "tick-4",
  uiState: {
    ...updatedTarget,
    DOCK: [],
  },
  frameDiff: { added: [], removed: ["opp:b:SUGGESTION"], updated: [] },
  timestamp: 1_700_000_003_000,
  uiCommit: true,
};

state = ingestFrame(state, removeFrame);
assert.equal(state.uiState.DOCK.length, 0);

assert.equal(shouldApplyFrame({ uiCommit: false, frameDiff: { added: ["x"], removed: [], updated: [] } }), false);
assert.equal(
  shouldApplyFrame({ uiCommit: true, frameDiff: { added: [], removed: [], updated: [] } }),
  false
);

const diffApplied = applyFrameDiff(
  state.uiState,
  {
    CALENDAR: [],
    DOCK: [
      {
        id: "opp:c:SUGGESTION",
        type: "SUGGESTION",
        title: "New dock item",
        relevance: 0.6,
      },
    ],
    TIMELINE: [],
    NARRATION: [],
  },
  { added: ["opp:c:SUGGESTION"], removed: ["opp:a:REMINDER"], updated: [] }
);

assert.equal(diffApplied.CALENDAR.length, 0);
assert.equal(diffApplied.DOCK[0]!.id, "opp:c:SUGGESTION");

const rebound = bindCommittedFrame(createFrameBinderState(), {
  tickId: "tick-x",
  uiState: emptyUiState(),
  frameDiff: { added: [], removed: [], updated: [] },
  timestamp: 0,
  uiCommit: true,
});
assert.equal(rebound.revision, 0);

console.log("test-react-atomic-frame-binder: ok");
