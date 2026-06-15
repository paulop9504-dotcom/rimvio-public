#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildSpatialContextFrame,
  buildSpatialGlobeView,
  projectEventToExperienceVolume,
  projectVolumeSpatialMedia,
  resolvePlaceCoordinates,
} from "../lib/experience-graph";
import type { EventCandidate } from "../lib/events/event-candidate";

const jeju: EventCandidate = {
  id: "ev-jeju-sync",
  title: "제주 여행",
  category: "travel",
  source: "peer_chat",
  lifecycle: "active",
  datetime: "2026-06-12T18:30:00+09:00",
  place: "제주 애월",
  confidence: 0.9,
  metadata: {
    planWindowEndIso: "2026-06-15T18:00:00+09:00",
    planPeerDisplayName: "민수",
  },
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const volume = projectEventToExperienceVolume(jeju);
assert.ok(volume);

const items = projectVolumeSpatialMedia(volume!);
assert.ok(items.length >= 4);

const photo = items.find((item) => item.kind === "photo");
const video = items.find((item) => item.kind === "video");
assert.ok(photo);
assert.ok(video);

const photoFrame = buildSpatialContextFrame(photo!);
const videoFrame = buildSpatialContextFrame(video!);
assert.notEqual(photoFrame.mediaId, videoFrame.mediaId);
assert.match(photoFrame.environmentLabel, /·/);
assert.ok(photoFrame.timeLabel);

const dunsan = resolvePlaceCoordinates("대전 둔산동");
assert.ok(dunsan.lat > 36 && dunsan.lat < 37);

const globePhoto = buildSpatialGlobeView({
  lat: photo!.lat,
  lng: photo!.lng,
  placeLabel: photo!.placeLabel,
});
const globeVideo = buildSpatialGlobeView({
  lat: video!.lat,
  lng: video!.lng,
  placeLabel: video!.placeLabel,
});
assert.ok(globePhoto.pinX >= 0 && globePhoto.pinX <= 100);
assert.equal(globePhoto.placeLabel, globeVideo.placeLabel);

console.log("test-spatial-context-sync: ok");
