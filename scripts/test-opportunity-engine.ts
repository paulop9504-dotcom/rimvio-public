#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  listRankedEventOpportunities,
  rankEventOpportunities,
} from "../lib/opportunity-engine/rank-event-opportunities";
import { resetEventCandidatesForTests } from "../lib/events/event-store";

const now = new Date("2026-06-01T16:30:00");
const REF = "2026-06-01";

function fixture(
  partial: Partial<EventCandidate> & Pick<EventCandidate, "id" | "title" | "lifecycle">
): EventCandidate {
  const ts = now.toISOString();
  return {
    category: "schedule",
    source: "message",
    confidence: 0.9,
    lifecycleUpdatedAt: ts,
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

const events: EventCandidate[] = [
  fixture({
    id: "ec-far",
    title: "헬스장",
    lifecycle: "mentioned",
    datetime: "2026-06-10T18:00:00",
  }),
  fixture({
    id: "ec-soon",
    title: "치과",
    lifecycle: "scheduled",
    datetime: `${REF}T17:00:00`,
  }),
  fixture({
    id: "ec-active",
    title: "미팅",
    lifecycle: "active",
    datetime: `${REF}T16:45:00`,
  }),
  fixture({
    id: "ec-archived",
    title: "숨김",
    lifecycle: "archived",
    datetime: `${REF}T12:00:00`,
  }),
  fixture({
    id: "msg-invalid",
    title: "잘못된 ID",
    lifecycle: "confirmed",
    datetime: `${REF}T18:00:00`,
  }),
];

const ranked = rankEventOpportunities(events, {
  now,
  focusedEcId: "ec-soon",
  maxResults: 3,
});

assert.equal(ranked.some((item) => item.ecId === "ec-archived"), false);
assert.equal(ranked.some((item) => item.ecId === "msg-invalid"), false);
assert.ok(ranked.length <= 3);
assert.equal(ranked[0]?.ecId, "ec-active");
assert.ok(ranked[0]!.score >= ranked[1]!.score);

resetEventCandidatesForTests(events.filter((e) => e.lifecycle !== "archived" && e.id.startsWith("ec-")));
const fromStore = listRankedEventOpportunities({ now, maxResults: 5 });
assert.ok(fromStore.length >= 2);
assert.equal(fromStore.some((item) => item.ecId === "ec-archived"), false);

resetEventCandidatesForTests([]);
assert.deepEqual(listRankedEventOpportunities({ now }), []);

resetEventCandidatesForTests([]);
console.log("test-opportunity-engine: ok");
