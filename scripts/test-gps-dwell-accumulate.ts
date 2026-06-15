import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "@/lib/events/event-store";
import { hasPendingFeedCaptureVerify } from "@/lib/feed/feed-capture-metadata";
import { resetGpsDwellIngestStoreForTests } from "@/lib/feed/gps-dwell-ingest-store";
import { ingestGpsDwellCluster } from "@/lib/feed/ingest-gps-dwell-to-feed";
import { sumGpsDwellCaptureMinutes } from "@/lib/feed/sum-gps-dwell-capture-minutes";
import type { GpsDwellCluster } from "@/lib/location-ping/gps-dwell-cluster-types";

function recentIso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

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

console.log("test-gps-dwell-accumulate: ok");
