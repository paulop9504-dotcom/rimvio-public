import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveSpacetimeFeedTarget } from "@/lib/feed/resolve-spacetime-feed-target";
import { scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import {
  appendFeedCaptureFragment,
  formatFeedCaptureSummaryLine,
  hasPendingFeedCaptureVerify,
  markFeedCapturesVerified,
  buildFeedCaptureVerifyLabel,
} from "@/lib/feed/feed-capture-metadata";

function eventStub(partial: Partial<EventCandidate> & Pick<EventCandidate, "id" | "title" | "datetime">): EventCandidate {
  const stamp = "2026-06-06T12:00:00.000Z";
  return {
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    ...partial,
  };
}

function testJejuPlanMatch() {
  const start = "2026-06-10T15:00:00+09:00";
  const end = "2026-06-12T19:00:00+09:00";
  const events = [
    eventStub({
      id: "jeju",
      title: "제주 여행",
      datetime: start,
      place: "제주 애월",
      metadata: {
        feedPlanEnabled: true,
        planWindowEndIso: end,
        planNights: 2,
      },
    }),
  ];

  const match = resolveSpacetimeFeedTarget({
    capturedAtIso: "2026-06-11T10:30:00+09:00",
    lat: 33.46,
    lng: 126.31,
    placeLabel: "제주",
    events,
  });

  assert.ok(match);
  assert.equal(match?.eventId, "jeju");
  assert.equal(match?.dayLabel, "Day 2");
  assert.equal(match?.confidence, "high");
}

function testMomentFallbackScore() {
  const fit = scoreSpacetimeFit({
    capturedAtIso: "2026-06-06T18:00:00+09:00",
    lat: 37.5,
    lng: 127.0,
    eventStartIso: "2026-06-06T17:30:00+09:00",
    eventEndIso: null,
    eventPlace: "강남역",
    capturedPlaceLabel: "강남역",
  });
  assert.equal(fit.fits, true);
  assert.ok(fit.score >= 0.8);
}

function testCaptureSummaryLine() {
  const event = eventStub({
    id: "x",
    title: "제주",
    datetime: "2026-06-10T15:00:00+09:00",
    place: "제주",
    metadata: appendFeedCaptureFragment(undefined, {
      id: "c1",
      kind: "photo",
      capturedAtIso: "2026-06-11T10:00:00+09:00",
    }),
  });
  assert.equal(formatFeedCaptureSummaryLine(event), "📷 1 · 제주");
}

function testVerifyPendingFlow() {
  const event = eventStub({
    id: "verify",
    title: "제주",
    datetime: "2026-06-10T15:00:00+09:00",
    place: "제주",
    metadata: {
      feedCapturePendingVerify: true,
      ...appendFeedCaptureFragment(undefined, {
        id: "c1",
        kind: "photo",
        capturedAtIso: "2026-06-11T10:00:00+09:00",
        autoAttached: true,
        verified: false,
      }),
    },
  });
  assert.equal(hasPendingFeedCaptureVerify(event), true);
  assert.equal(buildFeedCaptureVerifyLabel(event), "맞아요 · 📷 1");

  const verifiedMeta = markFeedCapturesVerified(event.metadata);
  const verifiedEvent = { ...event, metadata: verifiedMeta };
  assert.equal(hasPendingFeedCaptureVerify(verifiedEvent), false);
}

testJejuPlanMatch();
testMomentFallbackScore();
testCaptureSummaryLine();
testVerifyPendingFlow();
console.log("test-resolve-spacetime-feed-target: ok");
