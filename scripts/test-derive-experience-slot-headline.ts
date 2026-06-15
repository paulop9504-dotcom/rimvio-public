import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { deriveExperienceSlotHeadline } from "@/lib/feed/derive-experience-slot-headline";

const stamp = "2026-06-06T12:00:00.000Z";

function eventStub(partial: Partial<EventCandidate>): EventCandidate {
  return {
    id: "e1",
    title: "제주 여행",
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime: "2026-06-11T10:00:00+09:00",
    place: "제주",
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    ...partial,
  };
}

const plan = {
  planId: "jeju",
  title: "제주 여행",
  windowStartIso: "2026-06-10T15:00:00+09:00",
  windowEndIso: "2026-06-12T19:00:00+09:00",
  windowConfidence: "confirmed" as const,
  nights: 2,
  place: "제주",
  peerDisplayName: "민수",
  peerThreadId: "p1",
  attachMode: "new" as const,
  planMode: "group" as const,
};

const planHeadline = deriveExperienceSlotHeadline({
  event: eventStub({}),
  plan,
  fallbackHeadline: "내일 3시 제주",
  now: new Date("2026-06-11T12:00:00+09:00"),
});

assert.equal(planHeadline.headline, "민수랑 제주 Day 2");
assert.equal(planHeadline.eyebrow, null);

const gpsHeadline = deriveExperienceSlotHeadline({
  event: eventStub({
    title: "제주 · 48분 체류",
    metadata: { autoIngested: true, targetingSource: "gps_background" },
  }),
  plan: null,
  fallbackHeadline: "fallback",
});

assert.equal(gpsHeadline.headline, "제주 · 48분 체류");

console.log("test-derive-experience-slot-headline: ok");
