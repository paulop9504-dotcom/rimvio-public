#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { FeedCaptureFragment } from "../lib/feed/feed-capture-types";
import { projectRelationshipMeaningLine } from "../lib/copy/project-relationship-meaning-line";
import { collectRelationshipFacts } from "../lib/meaning/collect-relationship-facts";
import { detectRelationshipPatterns } from "../lib/meaning/detect-relationship-patterns";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-rel-test",
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

const routineWithMinsu = [1, 2, 3, 4, 5].map((index) =>
  baseEvent({
    id: `ev-cafe-${index}`,
    title: `민수랑 카페 ${index}`,
    category: "social",
    place: index % 2 === 0 ? "대전 둔산" : "대전 카페거리",
    datetime: `2026-0${(index % 5) + 1}-0${index + 1}T15:00:00.000Z`,
    metadata: {
      planPeerDisplayName: "민수",
      feedCaptures: captures([
        { id: `p-${index}`, kind: "photo", placeLabel: "대전" },
      ]),
    },
  }),
);

const facts = collectRelationshipFacts({
  displayName: "민수",
  events: routineWithMinsu,
  now,
});
assert.ok(facts);
assert.equal(facts!.contextCount, 5);
assert.ok(facts!.milestoneRatio < 0.4);

const patterns = detectRelationshipPatterns(facts!);
assert.ok(patterns.some((row) => row.frame === "repetition"));

const repetition = projectRelationshipMeaningLine({
  displayName: "민수",
  events: routineWithMinsu,
  now,
});
assert.ok(repetition);
assert.equal(repetition!.frame, "repetition");
assert.match(repetition!.line, /반복|겹친|꾸준/);
assert.match(repetition!.factAnchor, /민수 · 맥락 5/);

const spreadEvents = [
  ...routineWithMinsu,
  baseEvent({
    id: "ev-jeju",
    title: "민수랑 제주",
    place: "제주시",
    datetime: "2025-12-01T10:00:00.000Z",
    metadata: {
      planPeerDisplayName: "민수",
      feedCaptures: captures([{ id: "j1", placeLabel: "제주시" }]),
    },
  }),
  baseEvent({
    id: "ev-seoul",
    title: "민수랑 서울",
    place: "서울",
    datetime: "2025-11-01T10:00:00.000Z",
    metadata: {
      planPeerDisplayName: "민수",
      feedCaptures: captures([{ id: "s1", placeLabel: "서울" }]),
    },
  }),
  baseEvent({
    id: "ev-busan",
    title: "민수랑 부산",
    place: "부산",
    datetime: "2025-10-01T10:00:00.000Z",
    metadata: {
      planPeerDisplayName: "민수",
      feedCaptures: captures([{ id: "b1", placeLabel: "부산" }]),
    },
  }),
];

const spread = projectRelationshipMeaningLine({
  displayName: "민수",
  events: spreadEvents,
  now,
});
assert.ok(spread);
assert.ok(spread!.frame === "spread" || spread!.frame === "repetition");

const weak = projectRelationshipMeaningLine({
  displayName: "민수",
  events: routineWithMinsu.slice(0, 1),
  now,
});
assert.equal(weak, null);

console.log("test-relationship-meaning-line: ok");
