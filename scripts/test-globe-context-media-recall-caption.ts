#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildGlobeContextMediaRecallCaption } from "../lib/globe/build-context-media-recall-caption";

const caption = buildGlobeContextMediaRecallCaption({
  event: {
    id: "evt-1",
    title: "제주 여행",
    category: "travel",
    source: "manual",
    lifecycle: "completed",
    datetime: "2025-07-02T14:00:00.000Z",
    place: "제주",
    confidence: 0.9,
    metadata: {},
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  volume: {
    id: "vol-1",
    title: "제주 여행",
    sourceEventId: "evt-1",
    activeLayer: "experience",
    time: { startIso: "2025-07-02T14:00:00.000Z" },
    space: { label: "제주", clusterId: "jeju" },
    peaks: [],
    peerDisplayName: "민수",
    eventType: "trip",
    activeLens: "default",
  },
  item: {
    capturedAtIso: "2025-07-02T14:00:00.000Z",
    placeLabel: "제주",
    authorDisplayName: null,
    ownerUserId: null,
  },
  now: new Date("2026-06-14T12:00:00.000Z"),
});

assert.match(caption, /작년 여름 · 민수랑 제주/u);

const solo = buildGlobeContextMediaRecallCaption({
  event: null,
  volume: null,
  item: {
    capturedAtIso: "2024-12-01T12:00:00.000Z",
    placeLabel: "부산",
    authorDisplayName: null,
    ownerUserId: null,
  },
  now: new Date("2026-06-14T12:00:00.000Z"),
});

assert.match(solo, /재작년 겨울 · 부산/u);

console.log("test-globe-context-media-recall-caption: ok");
