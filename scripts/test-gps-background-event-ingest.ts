import assert from "node:assert/strict";
import { detectGpsDwellClusters } from "@/lib/location-ping/detect-gps-dwell-clusters";
import { resetGpsPingStoreForTests } from "@/lib/location-ping/gps-ping-store";
import { resetGpsDwellIngestStoreForTests } from "@/lib/feed/gps-dwell-ingest-store";
import { ingestGpsDwellCluster } from "@/lib/feed/ingest-gps-dwell-to-feed";
import {
  resetEventCandidatesForTests,
  upsertEventCandidate,
} from "@/lib/events/event-store";
import {
  appendFeedCaptureFragment,
  hasPendingFeedCaptureVerify,
  wasFeedCaptureHumanVerified,
} from "@/lib/feed/feed-capture-metadata";
import { sumGpsDwellCaptureMinutes } from "@/lib/feed/sum-gps-dwell-capture-minutes";
import type { GpsDwellCluster } from "@/lib/location-ping/gps-dwell-cluster-types";
import type { GpsPing } from "@/lib/location-ping/types";

const recentIso = (hoursAgo: number) =>
  new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

function jejuPings(): GpsPing[] {
  const base = Date.now() - 8 * 60 * 60 * 1000;
  return [0, 12, 24, 36, 48].map((offsetMin, index) => ({
    id: `p${index}`,
    lat: 33.46 + index * 0.0002,
    lng: 126.31 + index * 0.0002,
    accuracyM: 12,
    capturedAtIso: new Date(base + offsetMin * 60_000).toISOString(),
    source: "periodic" as const,
  }));
}

function jejuPlanWindow() {
  const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const end = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    datetime: start.toISOString(),
    planWindowEndIso: end.toISOString(),
    clusterNow: new Date(Date.now() - 6 * 60 * 60 * 1000),
  };
}

function testDetectClosedCluster() {
  const pings = jejuPings();
  const { clusterNow } = jejuPlanWindow();
  const clusters = detectGpsDwellClusters(pings, clusterNow);
  assert.equal(clusters.length, 1);
  assert.ok(clusters[0]?.placeLabel.includes("°"));
  assert.ok((clusters[0]?.dwellMinutes ?? 0) >= 15);
}

function testIngestAttachesToPlanEvent() {
  resetGpsDwellIngestStoreForTests();
  const stamp = new Date().toISOString();
  const { datetime, planWindowEndIso, clusterNow } = jejuPlanWindow();
  resetEventCandidatesForTests();
  upsertEventCandidate({
    id: "jeju-plan",
    title: "제주 여행",
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime,
    place: "제주",
    confidence: 0.9,
    metadata: {
      feedPlanEnabled: true,
      planWindowEndIso,
    },
    lifecycleUpdatedAt: stamp,
  });

  const clusters = detectGpsDwellClusters(jejuPings(), clusterNow);
  const cluster = clusters[0];
  assert.ok(cluster);

  const result = ingestGpsDwellCluster(cluster);
  assert.equal(result.ingested, true);
  assert.equal(result.event?.id, "jeju-plan");
  assert.equal(result.createdNewEvent, false);
}

function testIngestCreatesEventWithoutPhoto() {
  resetGpsPingStoreForTests(jejuPings());
  resetGpsDwellIngestStoreForTests();
  resetEventCandidatesForTests();

  const { clusterNow } = jejuPlanWindow();
  const clusters = detectGpsDwellClusters(jejuPings(), clusterNow);
  const cluster = clusters[0];
  assert.ok(cluster);

  const result = ingestGpsDwellCluster(cluster);
  assert.equal(result.ingested, true);
  assert.ok(result.event);
  assert.equal(result.createdNewEvent, true);
  assert.equal(hasPendingFeedCaptureVerify(result.event), true);

  const again = ingestGpsDwellCluster(cluster);
  assert.equal(again.ingested, false);
}

function testFollowUpDwellStaysVerifiedAfterHumanConfirm() {
  const stamp = new Date().toISOString();
  const verifiedMetadata = {
    targetingSource: "gps_background",
    feedCaptureVerifiedAt: stamp,
    feedCapturePendingVerify: false,
    feedCaptures: [
      {
        id: "gps-dwell:first",
        kind: "gps_dwell",
        capturedAtIso: "2026-06-06T10:00:00+09:00",
        autoAttached: true,
        verified: true,
        dwellMinutes: 129,
      },
    ],
  };

  assert.equal(wasFeedCaptureHumanVerified(verifiedMetadata), true);

  const followUpCluster: GpsDwellCluster = {
    id: "gps-dwell:follow-up:36300:127000",
    startIso: "2026-06-06T12:30:00+09:00",
    endIso: "2026-06-06T13:09:00+09:00",
    lat: 36.35,
    lng: 127.38,
    placeLabel: "둔산동",
    dwellMinutes: 39,
    pingCount: 5,
  };

  const humanVerified = wasFeedCaptureHumanVerified(verifiedMetadata);
  const metadata = {
    ...appendFeedCaptureFragment(verifiedMetadata, {
      id: followUpCluster.id,
      kind: "gps_dwell",
      capturedAtIso: followUpCluster.startIso,
      placeLabel: followUpCluster.placeLabel,
      label: `${followUpCluster.dwellMinutes}분`,
      dwellMinutes: followUpCluster.dwellMinutes,
      autoAttached: true,
      verified: humanVerified,
    }),
    feedCapturePendingVerify: humanVerified ? false : true,
  };

  assert.equal(hasPendingFeedCaptureVerify({ metadata } as import("../lib/events/event-candidate").EventCandidate), false);
}

function testAccumulateSamePlaceBeforeAsk() {
  resetGpsDwellIngestStoreForTests();
  resetEventCandidatesForTests();

  const morning: GpsDwellCluster = {
    id: "gps-dwell:morning:36300:127000",
    startIso: recentIso(6),
    endIso: recentIso(5.7),
    lat: 36.35,
    lng: 127.38,
    placeLabel: "둔산동",
    dwellMinutes: 18,
    pingCount: 4,
  };
  const first = ingestGpsDwellCluster(morning);
  assert.equal(first.ingested, true);
  assert.ok(first.event);
  assert.equal(hasPendingFeedCaptureVerify(first.event), false);
  assert.equal(sumGpsDwellCaptureMinutes(first.event), 18);

  const afternoon: GpsDwellCluster = {
    id: "gps-dwell:afternoon:36300:127000",
    startIso: recentIso(3),
    endIso: recentIso(2.6),
    lat: 36.351,
    lng: 127.381,
    placeLabel: "둔산동",
    dwellMinutes: 22,
    pingCount: 5,
  };
  const second = ingestGpsDwellCluster(afternoon);
  assert.equal(second.ingested, true);
  assert.equal(second.event?.id, first.event?.id);
  assert.equal(sumGpsDwellCaptureMinutes(second.event), 40);
  assert.equal(hasPendingFeedCaptureVerify(second.event), true);
}

testDetectClosedCluster();
testIngestAttachesToPlanEvent();
testIngestCreatesEventWithoutPhoto();
testFollowUpDwellStaysVerifiedAfterHumanConfirm();
testAccumulateSamePlaceBeforeAsk();
console.log("test-gps-background-event-ingest: ok");
