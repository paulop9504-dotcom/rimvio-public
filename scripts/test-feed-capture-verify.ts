import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { upsertEventCandidate } from "@/lib/events/event-store";
import { hasPendingFeedCaptureVerify } from "@/lib/feed/feed-capture-metadata";
import { verifyFeedCaptureEvent } from "@/lib/feed/verify-feed-capture";

function seedEvent(): EventCandidate {
  const stamp = new Date().toISOString();
  return upsertEventCandidate({
    id: "feed-verify-demo",
    title: "제주 여행",
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime: "2026-06-10T15:00:00+09:00",
    place: "제주",
    confidence: 0.88,
    metadata: {
      feedCapturePendingVerify: true,
      feedCaptures: [
        {
          id: "cap-1",
          kind: "photo",
          capturedAtIso: "2026-06-11T10:00:00+09:00",
          autoAttached: true,
          verified: false,
        },
      ],
      feedCaptureStats: { photos: 1, videos: 0, links: 0, memos: 0 },
    },
    lifecycleUpdatedAt: stamp,
  });
}

const seeded = seedEvent();
assert.equal(hasPendingFeedCaptureVerify(seeded), true);

const verified = verifyFeedCaptureEvent(seeded.id);
assert.equal(verified.ok, true);
assert.equal(verified.alreadyVerified, false);
assert.ok(verified.event);
assert.equal(hasPendingFeedCaptureVerify(verified.event), false);
assert.equal(verified.event.metadata?.feedCaptureVerifiedAt, verified.event.metadata?.feedCaptureVerifiedAt);

const again = verifyFeedCaptureEvent(seeded.id);
assert.equal(again.alreadyVerified, true);

console.log("test-feed-capture-verify: ok");
