#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import {
  findFeedSlotByEventId,
  pickDefaultFeedActiveEventId,
} from "@/lib/feed/resolve-feed-active-recall";

const stamp = "2026-06-06T12:00:00.000Z";

const eventsById = new Map<string, EventCandidate>([
  [
    "jeju",
    {
      id: "jeju",
      title: "제주 여행",
      category: "travel",
      source: "manual",
      lifecycle: "active",
      datetime: stamp,
      place: "제주",
      confidence: 0.9,
      metadata: { feedPlanEnabled: true, planPeerDisplayName: "민수" },
      lifecycleUpdatedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ],
]);

const slot: FeedTodaySlot = {
  kind: "calendar",
  id: "calendar:jeju",
  slotType: "travel",
  row: {
    id: "r1",
    event: {
      id: "chip",
      layer: "action",
      eventId: "jeju",
      entry: null,
      title: "제주 여행",
      dateKey: "2026-06-06",
      startMs: Date.parse(stamp),
      hour: 12,
      minute: 0,
      tone: "green",
    },
    prompt_hint: "제주",
  },
} as FeedTodaySlot;

assert.equal(findFeedSlotByEventId([slot], "jeju")?.id, "calendar:jeju");
assert.equal(pickDefaultFeedActiveEventId([slot], undefined, eventsById, "jeju"), "jeju");

console.log("test-feed-active-recall: ok");
