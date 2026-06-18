#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildExperienceRecallCaption } from "../lib/feed/build-experience-recall-caption";
import type { SpatialMediaItem } from "../lib/experience-graph/spatial-media-types";

const item: SpatialMediaItem = {
  id: "upload:ctx-1",
  kind: "photo",
  title: "도착",
  caption: "제주에 닿은 순간",
  capturedAtIso: "2026-07-02T14:00:00.000Z",
  placeLabel: "제주",
  clusterId: "jeju",
  lat: 33.5,
  lng: 126.5,
  timeOfDay: "afternoon",
  season: "summer",
  weatherCondition: "clear",
  weatherLabel: "맑음",
};

assert.match(
  buildExperienceRecallCaption({
    item,
    volume: {
      id: "vol-1",
      title: "제주 여행",
      sourceEventId: "evt-1",
      activeLayer: "experience",
      time: { startIso: item.capturedAtIso },
      space: { label: "제주", clusterId: "jeju" },
      peaks: [],
      peerDisplayName: "민수",
      eventType: "trip",
      activeLens: "default",
    },
  }),
  /2026년.*여름.*민수랑.*제주/u,
);

console.log("✓ build-experience-recall-caption");
