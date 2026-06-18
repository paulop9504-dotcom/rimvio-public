#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  FEED_CAPTURE_PENDING_VERIFY_META_KEY,
  FEED_CAPTURES_META_KEY,
} from "@/lib/feed/feed-capture-types";
import {
  gateFeedSlotPills,
  gatePlanStackProjection,
  shouldDeferFeedRecommendations,
  shouldDeferFeedSpawnUri,
} from "@/lib/feed/feed-verify-recommendation-gate";
import { resolveFeedSlotPills } from "@/lib/feed/resolve-feed-slot-pills";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";

const pendingEvent: EventCandidate = {
  id: "e1",
  title: "제주",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  confidence: 0.9,
  lifecycleUpdatedAt: "2026-06-06T12:00:00.000Z",
  createdAt: "2026-06-06T12:00:00.000Z",
  updatedAt: "2026-06-06T12:00:00.000Z",
  metadata: {
    [FEED_CAPTURE_PENDING_VERIFY_META_KEY]: true,
    [FEED_CAPTURES_META_KEY]: [
      {
        id: "c1",
        kind: "photo",
        capturedAtIso: "2026-06-06T12:00:00.000Z",
        autoAttached: true,
        verified: false,
      },
    ],
  },
};

const slot = {
  kind: "calendar",
  id: "calendar:1",
  slotType: "travel",
  row: {
    id: "r1",
    event: {
      id: "chip",
      layer: "action",
      eventId: "e1",
      entry: null,
      title: "제주 여행",
      dateKey: "2026-06-06",
      startMs: Date.parse("2026-06-06T12:00:00+09:00"),
      hour: 12,
      minute: 0,
      tone: "green",
    },
    prompt_hint: "제주역 근처",
    context_lines: ["제주역"],
  },
} as FeedTodaySlot;

assert.equal(shouldDeferFeedRecommendations(pendingEvent), true);
assert.equal(shouldDeferFeedSpawnUri("rimvio://navigate/kakao?q=제주", pendingEvent), true);

const rawPills = resolveFeedSlotPills(slot);
assert.ok(rawPills.some((pill) => pill.label === "길찾기"));
const gated = gateFeedSlotPills(rawPills, pendingEvent);
assert.equal(gated.some((pill) => pill.label === "길찾기"), false);
assert.equal(gated.some((pill) => pill.label === "나중에"), true);

const gatedStack = gatePlanStackProjection(
  {
    before: [
      { id: "travel", band: "before", label: "이동·출발 준비", spawnPhase: "travel" },
      { id: "pack", band: "before", label: "짐 챙기기" },
    ],
    after: [{ id: "food", band: "after", label: "맛집 보기", deeplink: "rimvio://food/search" }],
  },
  pendingEvent,
);
assert.equal(gatedStack?.before.length, 1);
assert.equal(gatedStack?.before[0]?.label, "짐 챙기기");
assert.equal(gatedStack?.after.length, 0);

console.log("test-feed-verify-recommendation-gate: ok");
