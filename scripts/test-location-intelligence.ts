#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { analyzeIntentSlots } from "../lib/location-intelligence/analyze-intent-slots";
import { inferLifeZoneFromActivities } from "../lib/location-memory/infer-life-zone";
import { formatLifeZoneContextBlock, buildLocationMemoryWire } from "../lib/location-memory/format-life-zone-context";
import { extractRegionLabel } from "../lib/location-memory/extract-region-label";
import type { SearchActivityEntry } from "../lib/location-memory/types";

const hair = analyzeIntentSlots({
  message: "2시 30분 헤어숍 예약해줘",
  referenceDate: "2026-05-29",
});

assert.equal(hair.intent, "reserve");
assert.ok(hair.missing_slots.includes("branch") || hair.missing_slots.includes("place_name"));
assert.ok(hair.found_slots.time || hair.found_slots.date);

const nav = analyzeIntentSlots({
  message: "대전역 가줘",
  referenceDate: "2026-05-29",
});

assert.equal(nav.intent, "navigate");
assert.ok(nav.found_slots.destination?.includes("대전역") || nav.found_slots.place_name);
assert.ok(nav.missing_slots.includes("origin"));

assert.equal(extractRegionLabel({ query: "유성구 카페" }), "유성구");

const activities: SearchActivityEntry[] = [
  {
    id: "1",
    query: "유성구 카페",
    kind: "discovery",
    region_label: "유성구",
    place_label: null,
    lat: null,
    lng: null,
    createdAt: "2026-05-20T10:00:00.000Z",
  },
  {
    id: "2",
    query: "유성구 맛집",
    kind: "discovery",
    region_label: "유성구",
    place_label: null,
    lat: null,
    lng: null,
    createdAt: "2026-05-25T10:00:00.000Z",
  },
  {
    id: "3",
    query: "유성구 도서관",
    kind: "place_search",
    region_label: "유성구",
    place_label: null,
    lat: null,
    lng: null,
    createdAt: "2026-05-28T10:00:00.000Z",
  },
];

const zone = inferLifeZoneFromActivities(activities);
assert.ok(zone);
assert.equal(zone?.label, "유성구");
assert.match(zone?.transparent_line ?? "", /유성구/u);

const memory = buildLocationMemoryWire({ recentActivities: activities });
const block = formatLifeZoneContextBlock(memory);
assert.ok(block);
assert.match(block ?? "", /LIFE_ZONE_CONTEXT/u);
assert.match(block ?? "", /유성구/u);

console.log("test-location-intelligence: ok");
