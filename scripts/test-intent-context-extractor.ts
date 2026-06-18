#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { extractIntentContext } from "../lib/intent-context-extractor/extract-intent-context";
import {
  parseIntentContextWire,
  validateIntentContextWire,
} from "../lib/intent-context-extractor/parse-intent-context-wire";

const meetingTravel = extractIntentContext({
  message: "출근 및 하루 시작",
  event: {
    title: "중요 파트너사 외부 미팅 (강남역)",
    location: "강남역",
    minutes_until: 45,
  },
  signals: {
    upcoming_meeting_count: 1,
    unread_team_feedback_count: 3,
    proximity: "en_route",
  },
});

assert.equal(meetingTravel.context.type, "work");
assert.ok(meetingTravel.possible_actions.some((item) => item.action.includes("카카오T")));
assert.ok(meetingTravel.possible_actions.some((item) => item.category === "main"));
assert.ok(meetingTravel.secondary_reason_signals.includes("urgency"));
assert.ok(meetingTravel.possible_actions.length >= 2);

const onSite = extractIntentContext({
  event: {
    title: "중요 파트너사 외부 미팅 (강남역)",
    location: "강남역",
    minutes_until: 5,
  },
  signals: { proximity: "at_venue" },
});

assert.ok(onSite.possible_actions.some((item) => item.action.includes("PDF")));
assert.ok(onSite.possible_actions.some((item) => item.action.includes("QR")));

const gym = extractIntentContext({
  event: { title: "헬스장 개인 PT 세션", minutes_until: 90 },
});

assert.equal(gym.context.type, "health");
assert.ok(gym.possible_actions.some((item) => item.action.includes("샐러드")));
assert.ok(gym.possible_actions.some((item) => item.action.includes("바코드")));

const wireJson = parseIntentContextWire({
  intent: "test",
  context: {
    type: "work",
    entities: ["강남역"],
    time_sensitivity: "high",
    location_relevance: "direct",
  },
  possible_actions: [
    { action: "이동", category: "main", reason: "travel" },
  ],
  secondary_reason_signals: ["urgency", "invalid_signal"],
});

assert.ok(wireJson);
assert.deepEqual(wireJson?.secondary_reason_signals, ["urgency"]);
assert.equal(validateIntentContextWire(wireJson!).length, 0);

console.log("test-intent-context-extractor: ok");
