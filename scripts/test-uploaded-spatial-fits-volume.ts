#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { ExperienceVolume } from "../lib/experience-graph/experience-volume-types";
import type { MediaSpacetimeContext } from "../lib/location-ping/types";
import { fitsUploadedMediaVolume } from "../lib/location-ping/project-uploaded-spatial-media";
import { resolvePlaceCoordinates } from "../lib/experience-graph/resolve-place-coordinates";

const shanghaiVolume: ExperienceVolume = {
  id: "vol-shanghai",
  sourceEventId: "evt-shanghai",
  title: "정성이랑 여행",
  space: { label: "상하이", clusterId: "shanghai" },
  time: {
    startIso: "2026-01-05T10:00:00+09:00",
    endIso: "2026-01-08T10:00:00+09:00",
  },
  peaks: [],
};

const jejuVolume: ExperienceVolume = {
  id: "vol-jeju",
  sourceEventId: "evt-jeju",
  title: "제주 여행",
  space: { label: "제주", clusterId: "jeju" },
  time: {
    startIso: "2026-02-01T10:00:00+09:00",
    endIso: "2026-02-04T10:00:00+09:00",
  },
  peaks: [],
};

const shanghaiVideo: MediaSpacetimeContext = {
  id: "mc-shanghai-video",
  mediaKind: "video",
  capturedAtIso: "2026-01-05T12:00:00+09:00",
  originRef: "evt-shanghai",
  lat: 31.23,
  lng: 121.47,
  placeLabel: "상하이",
};

const jejuCoords = resolvePlaceCoordinates(jejuVolume.space.label);
const shanghaiCoords = resolvePlaceCoordinates(shanghaiVolume.space.label);

assert.equal(
  fitsUploadedMediaVolume(shanghaiVideo, shanghaiVolume, shanghaiCoords),
  true,
  "originRef match attaches to Shanghai",
);
assert.equal(
  fitsUploadedMediaVolume(shanghaiVideo, jejuVolume, jejuCoords),
  false,
  "Shanghai video must not attach to Jeju volume",
);

console.log("test-uploaded-spatial-fits-volume: ok");
