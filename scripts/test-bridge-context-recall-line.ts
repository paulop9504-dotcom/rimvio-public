import assert from "node:assert/strict";
import { buildBridgeContextRecallLine } from "../lib/globe/build-bridge-context-recall-line";
import type { EventCandidate } from "../lib/events/event-candidate";

const now = new Date("2026-06-14T12:00:00.000Z");

const event: EventCandidate = {
  id: "evt-bridge-1",
  title: "제주 여행",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: "2025-08-10T09:00:00.000Z",
  place: "제주",
  confidence: 0.9,
  createdAt: "2025-08-10T09:00:00.000Z",
  metadata: { planPeerDisplayName: "민수" },
};

const recall = buildBridgeContextRecallLine({
  event,
  allEvents: [event],
  reelItems: [],
  now,
});

assert.ok(recall.primary.length > 0, "primary recall line");
assert.ok(recall.secondary?.includes("개월") || recall.secondary?.includes("민수"), "secondary line");

console.log("test-bridge-context-recall-line: ok");
