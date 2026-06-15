#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { projectLocationEventFromGpsPing } from "../lib/location-ping/location-event";
import { projectLiveLocationSnapshot } from "../lib/location-ping/project-live-location-snapshot";
import type { GpsPing } from "../lib/location-ping/types";

const now = new Date("2026-06-10T15:00:00+09:00");

function ping(
  id: string,
  lat: number,
  lng: number,
  iso: string,
): GpsPing {
  return {
    id,
    lat,
    lng,
    accuracyM: 25,
    capturedAtIso: iso,
    source: "periodic",
  };
}

const pings = [
  ping("p1", 37.498, 127.028, "2026-06-10T14:30:00+09:00"),
  ping("p2", 37.4981, 127.0281, "2026-06-10T14:33:00+09:00"),
  ping("p3", 37.4982, 127.0282, "2026-06-10T14:36:00+09:00"),
  ping("p4", 37.4983, 127.0283, "2026-06-10T14:50:00+09:00"),
];

const locationEvent = projectLocationEventFromGpsPing(pings[3]!);
assert.equal(locationEvent.id, "p4");
assert.equal(locationEvent.lat, 37.4983);

const snapshot = projectLiveLocationSnapshot(pings, now.getTime());
assert.ok(snapshot);
assert.match(snapshot!.placeLabel, /강남|37\.498/u);
assert.equal(snapshot!.contextLabel, "체류 중");

const stale = projectLiveLocationSnapshot(
  [ping("old", 37.5, 127.0, "2026-06-10T10:00:00+09:00")],
  now.getTime(),
);
assert.equal(stale, null);

console.log("test-gps-ingest-vertical-slice: ok");
