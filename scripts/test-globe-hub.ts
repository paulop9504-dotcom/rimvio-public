#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildGlobeSpaceBlobs,
  buildExperienceGraphFromEvents,
  filterVolumesByCluster,
  projectClusterSpatialMedia,
  projectEventToExperienceVolume,
} from "../lib/experience-graph";
import type { EventCandidate } from "../lib/events/event-candidate";

function event(id: string, title: string, place: string, iso: string): EventCandidate {
  const stamp = new Date().toISOString();
  return {
    id,
    title,
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime: iso,
    place,
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

const events = [
  event("e1", "제주", "제주 애월", "2026-06-12T15:00:00+09:00"),
  event("e2", "둔산", "대전 둔산동", "2026-05-01T19:00:00+09:00"),
  event("e3", "강남", "강남역", "2026-06-03T10:00:00+09:00"),
];

const graph = buildExperienceGraphFromEvents(events);
assert.equal(graph.volumes.length, 3);

const blobs = buildGlobeSpaceBlobs(graph.volumes);
assert.ok(blobs.length >= 3);

const jeju = blobs.find((blob) => /제주/u.test(blob.label));
assert.ok(jeju);

const clusterVolumes = filterVolumesByCluster(graph.volumes, jeju!.clusterId);
assert.equal(clusterVolumes.length, 1);

const media = projectClusterSpatialMedia(clusterVolumes);
assert.ok(media.length >= 3);

const volume = projectEventToExperienceVolume(events[0]!);
assert.ok(volume?.space.clusterId);

console.log("test-globe-hub: ok");
