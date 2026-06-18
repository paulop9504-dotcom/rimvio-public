#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { detectExperienceBurst } from "../lib/experience-gravity/detect-experience-burst";
import { scoreCohesionWindow } from "../lib/experience-gravity/score-cohesion-window";
import type { MediaSpacetimeContext } from "../lib/location-ping/types";

const groupA = "peer-group-aaa-aaa-aaa-aaa-aaa-aaa-aaa-aaa";
const groupB = "peer-group-bbb-bbb-bbb-bbb-bbb-bbb-bbb-bbb";

const weddingPlan: EventCandidate = {
  id: "ec-wedding",
  title: "민수 결혼식",
  category: "social",
  source: "message",
  lifecycle: "active",
  datetime: "2026-06-05T11:00:00+09:00",
  place: "서울 웨딩홀",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planPeerThreadId: groupA,
    planWindowStartIso: "2026-06-05T10:00:00+09:00",
    planWindowEndIso: "2026-06-05T22:00:00+09:00",
  },
  lifecycleUpdatedAt: "2026-06-05T00:00:00.000Z",
  createdAt: "2026-06-05T00:00:00.000Z",
  updatedAt: "2026-06-05T00:00:00.000Z",
};

function ctx(
  index: number,
  partial: Partial<MediaSpacetimeContext> = {},
): MediaSpacetimeContext {
  const hour = 11 + Math.floor(index / 2);
  const minute = (index % 2) * 20;
  return {
    id: `mc-burst-${index}`,
    capturedAtIso: `2026-06-05T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`,
    lat: 37.5665,
    lng: 126.978,
    accuracyM: 15,
    placeLabel: "서울 웨딩홀",
    resolveSource: "exif_datetime",
    matchedPingId: null,
    mediaKind: index % 5 === 0 ? "video" : "photo",
    origin: "peer_chat",
    originRef: index % 3 === 0 ? groupB : groupA,
    fileName: `wedding-${index}.jpg`,
    attachedAtIso: `2026-06-05T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`,
    ...partial,
  };
}

const burstContexts = Array.from({ length: 8 }, (_, index) => ctx(index));
const now = new Date("2026-06-05T18:00:00+09:00");

const score = scoreCohesionWindow({
  contexts: burstContexts,
  windowStartIso: "2026-06-05T10:00:00+09:00",
  windowEndIso: now.toISOString(),
});
assert.ok(score.total >= 0.58, `expected cohesion >= 0.58, got ${score.total}`);
assert.ok(score.mediaScore > 0);
assert.ok(score.placeScore > 0);

const burst = detectExperienceBurst({
  contexts: burstContexts,
  events: [weddingPlan],
  now,
  windowMs: 10 * 60 * 60 * 1000,
});
assert.ok(burst, "expected wedding burst");
assert.equal(burst!.photoCount, 6);
assert.equal(burst!.videoCount, 2);
assert.equal(burst!.contextIds.length, 8);
assert.equal(burst!.uniqueThreadCount, 2);
assert.equal(burst!.targetEventId, "ec-wedding");
assert.match(burst!.title, /민수|웨딩|결혼/);

const commute = detectExperienceBurst({
  contexts: [
    ctx(0, {
      capturedAtIso: "2026-06-05T08:00:00+09:00",
      placeLabel: null,
      lat: null,
      lng: null,
      resolveSource: "file_mtime",
      origin: "other",
    }),
    ctx(1, {
      capturedAtIso: "2026-06-05T08:05:00+09:00",
      placeLabel: null,
      lat: null,
      lng: null,
      resolveSource: "file_mtime",
      origin: "other",
    }),
  ],
  events: [weddingPlan],
  now,
});
assert.equal(commute, null);

console.log("test-experience-gravity-burst: ok");
