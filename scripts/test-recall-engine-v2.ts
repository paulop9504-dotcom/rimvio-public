#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { FeedCaptureFragment } from "../lib/feed/feed-capture-types";
import {
  markRecallCandidateShown,
  pickSurfacedRecallCandidate,
  resetRecallSpamGateForTests,
  resolveRecallCandidates,
  resolveSurfacedRecall,
} from "../lib/recall";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-recall-test",
    title: "테스트",
    category: "travel",
    source: "message",
    lifecycle: "completed",
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function captures(rows: Partial<FeedCaptureFragment>[]): FeedCaptureFragment[] {
  return rows.map((row, index) => ({
    id: row.id ?? `cap-${index}`,
    kind: row.kind ?? "photo",
    capturedAtIso: row.capturedAtIso ?? new Date().toISOString(),
    verified: row.verified ?? true,
    ...row,
  }));
}

const now = new Date("2026-06-10T12:00:00.000Z");

const pastJeju = baseEvent({
  id: "ev-jeju-2025",
  title: "민수랑 제주 여행",
  place: "제주시",
  datetime: "2025-06-10T09:00:00.000Z",
  metadata: {
    planPeerDisplayName: "민수",
    feedCaptures: captures([
      {
        id: "p1",
        kind: "photo",
        placeLabel: "제주시",
        capturedAtIso: "2025-06-10T14:00:00.000Z",
      },
    ]),
  },
});

const activeJejuPlan = baseEvent({
  id: "ev-jeju-2026",
  title: "제주 여행",
  lifecycle: "active",
  place: "제주시",
  datetime: "2026-06-10T09:00:00.000Z",
  metadata: {
    planPeerDisplayName: "민수",
    feedPlanEnabled: true,
  },
});

resetRecallSpamGateForTests();

const candidates = resolveRecallCandidates({
  anchor: {
    eventId: activeJejuPlan.id,
    title: activeJejuPlan.title,
    place: "제주시",
    peerDisplayName: "민수",
    datetimeIso: activeJejuPlan.datetime,
  },
  events: [pastJeju, activeJejuPlan],
  now,
});

assert.ok(candidates.length >= 1, "expected at least one recall candidate");
const top = candidates[0]!;
assert.equal(top.eventId, "ev-jeju-2025");
assert.ok(top.confidence >= 45);
assert.ok(top.triggers.includes("same_person"));
assert.ok(top.triggers.includes("same_place"));
assert.ok(top.triggers.includes("same_date"));
assert.ok(top.headline.length > 0);
assert.equal(top.media.kind, "photo");
assert.ok(top.reason.includes("같은 사람"));
assert.ok(top.feedHref.includes("ev-jeju-2025"));

const surfaced = resolveSurfacedRecall({
  anchor: {
    eventId: activeJejuPlan.id,
    title: activeJejuPlan.title,
    place: "제주시",
    peerDisplayName: "민수",
    datetimeIso: activeJejuPlan.datetime,
  },
  events: [pastJeju, activeJejuPlan],
  now,
});
assert.ok(surfaced);
assert.equal(surfaced!.id, top.id);

markRecallCandidateShown(surfaced!.id, surfaced!.eventId, now);
const blocked = pickSurfacedRecallCandidate(candidates, now);
assert.equal(blocked, null, "daily nostalgia spam gate should block second recall");

const unrelated = resolveRecallCandidates({
  anchor: {
    title: "강남 저녁 약속",
    place: "강남역",
    datetimeIso: "2026-06-10T19:00:00.000Z",
  },
  events: [pastJeju],
  now,
});
assert.equal(unrelated.length, 0);

const gcalPast = baseEvent({
  id: "ev-birthday-2024",
  title: "엄마 생신",
  category: "social",
  datetime: "2024-03-15T18:00:00.000Z",
  place: "본가",
  metadata: {
    gcalEventId: "gcal-mom-birthday",
    planPeerDisplayName: "엄마",
  },
});

const gcalAnchor = resolveRecallCandidates({
  anchor: {
    title: "엄마 생신",
    place: "본가",
    peerDisplayName: "엄마",
    datetimeIso: "2026-03-15T18:00:00.000Z",
    gcalEventId: "gcal-mom-birthday",
  },
  events: [gcalPast],
  now: new Date("2026-03-15T12:00:00.000Z"),
});
assert.ok(gcalAnchor.length >= 1);
assert.ok(gcalAnchor[0]!.triggers.includes("same_calendar_event"));

console.log("--- RecallCandidate ---");
console.log(`headline: ${top.headline}`);
console.log(`reason: ${top.reason}`);
console.log(`confidence: ${top.confidence}`);
console.log(`triggers: ${top.triggers.join(", ")}`);
console.log(`media: ${top.media.kind} ${top.media.captureId ?? ""}`);

console.log("\ntest-recall-engine-v2: ok");
