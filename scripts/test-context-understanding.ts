#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { extractContextUnderstanding } from "../lib/context-understanding/extract-context-understanding";
import { parseContextUnderstandingWire } from "../lib/context-understanding/parse-context-understanding-wire";

const meetingPrep = extractContextUnderstanding({
  message: "내일 강남 미팅 준비해야 할 것 같아",
  system_context: {
    calendar_events: [
      {
        title: "강남 파트너 미팅",
        location: "강남역",
        minutes_until: 1440,
      },
    ],
  },
});

assert.equal(meetingPrep.intent, "meeting preparation");
assert.equal(meetingPrep.event_type_hint, "work");
assert.equal(meetingPrep.importance_signal, "high");
assert.ok(meetingPrep.entities.some((item) => item.includes("강남")));
assert.ok(meetingPrep.possible_meanings.includes("documents may be needed"));
assert.ok(meetingPrep.risk_or_attention_signals.includes("preparation_needed"));
assert.ok(meetingPrep.risk_or_attention_signals.includes("coordination_required"));

const wire = parseContextUnderstandingWire(meetingPrep);
assert.ok(wire);
assert.equal(wire?.intent, meetingPrep.intent);

const gym = extractContextUnderstanding({
  message: "퇴근하고 PT",
  system_context: {
    calendar_events: [{ title: "헬스장 개인 PT 세션", minutes_until: 120 }],
  },
});

assert.equal(gym.event_type_hint, "health");
assert.ok(gym.possible_meanings.length > 0);

console.log("test-context-understanding: ok");
