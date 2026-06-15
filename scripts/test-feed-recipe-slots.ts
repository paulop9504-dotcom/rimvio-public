#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { FeedCaptureFragment } from "../lib/feed/feed-capture-types";
import {
  FEED_RECIPE_REGISTRY,
  feedRecipeForIntent,
  projectFeedRecipeSlots,
  resolveExperienceIntent,
} from "../lib/experience-intent";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-recipe-test",
    title: "테스트",
    category: "schedule",
    source: "message",
    lifecycle: "scheduled",
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
    ...row,
  }));
}

assert.deepEqual(feedRecipeForIntent("other"), null);
assert.equal(FEED_RECIPE_REGISTRY.wedding.slots.join(","), "people,memory,mobility,prep");
assert.equal(FEED_RECIPE_REGISTRY.travel.slots.join(","), "mobility,stay,place,memory");
assert.equal(FEED_RECIPE_REGISTRY.business.slots.join(","), "schedule,documents,mobility,stay");
assert.equal(FEED_RECIPE_REGISTRY.meeting.slots.join(","), "people,schedule,mobility,prep");
assert.equal(FEED_RECIPE_REGISTRY.birthday.slots.join(","), "people,memory,place,prep");
assert.equal(FEED_RECIPE_REGISTRY.hospital.slots.join(","), "schedule,place,documents,mobility");

const cases = [
  {
    label: "민수 결혼식",
    event: baseEvent({
      title: "민수 결혼식",
      category: "social",
      metadata: {
        planPeerThreadId: "peer-group-abc",
        planPeerDisplayName: "민수",
        attendees: Array.from({ length: 10 }, (_, i) => `guest-${i}`),
        feedCaptures: captures(
          Array.from({ length: 8 }, (_, i) => ({ id: `w-${i}`, kind: "photo" as const })),
        ),
      },
    }),
    intent: "wedding" as const,
    slotKinds: ["people", "memory", "mobility", "prep"],
  },
  {
    label: "제주 여행",
    event: baseEvent({
      title: "제주 여행",
      category: "travel",
      place: "제주시",
      metadata: {
        planNights: 2,
        planPlace: "제주시",
        feedCaptures: captures([
          { kind: "gps_dwell", placeLabel: "제주시" },
          { kind: "photo", id: "p1" },
        ]),
      },
    }),
    intent: "travel" as const,
    slotKinds: ["mobility", "stay", "place", "memory"],
  },
  {
    label: "독일 출장",
    event: baseEvent({
      title: "독일 출장",
      category: "travel",
      place: "프랑크푸르트",
      datetime: "2026-07-01T09:00:00.000Z",
      metadata: {
        planNights: 3,
        planPlace: "프랑크푸르트",
      },
    }),
    intent: "business" as const,
    slotKinds: ["schedule", "documents", "mobility", "stay"],
  },
  {
    label: "엄마 생신",
    event: baseEvent({
      title: "엄마 생신",
      category: "social",
      place: "본가",
      metadata: {
        planPeerDisplayName: "엄마",
        feedCaptures: captures([{ kind: "photo", id: "mom" }]),
      },
    }),
    intent: "birthday" as const,
    slotKinds: ["people", "memory", "place", "prep"],
  },
] as const;

for (const row of cases) {
  const resolution = resolveExperienceIntent(row.event);
  assert.equal(
    resolution.intent,
    row.intent,
    `${row.label}: expected intent ${row.intent}, got ${resolution.intent}`,
  );

  const projection = projectFeedRecipeSlots({
    event: row.event,
    plan: {
      title: row.event.title,
      attachMode: "new",
      windowConfidence: "open",
      place: typeof row.event.metadata?.planPlace === "string" ? row.event.metadata.planPlace : row.event.place,
      nights: typeof row.event.metadata?.planNights === "number" ? row.event.metadata.planNights : undefined,
      peerDisplayName:
        typeof row.event.metadata?.planPeerDisplayName === "string"
          ? row.event.metadata.planPeerDisplayName
          : undefined,
    },
    peers: [],
    timelineAggregate: {
      photos: 3,
      videos: 0,
      links: 1,
      memos: 0,
      dwellMinutes: 45,
      friendCount: 0,
      friendLabels: [],
      hasContent: true,
    },
    timeLabel: "오후 2시",
    prepLine: "우산 챙기기",
    placeLabel: row.event.place ?? null,
    pills: [],
  });

  assert.ok(projection, `${row.label}: expected recipe projection`);
  assert.equal(projection!.intent, row.intent);
  assert.deepEqual(
    projection!.slots.map((slot) => slot.kind),
    row.slotKinds,
    `${row.label}: slot order mismatch`,
  );
  assert.equal(projection!.slots.length, 4);

  console.log(`[${row.label}] intent=${projection!.intent} slots=${projection!.slots.map((s) => `${s.emoji}${s.label}:${s.summary ?? "—"}`).join(" | ")}`);
}

console.log("test-feed-recipe-slots: ok");
