#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { fetchTrafficContext } from "../lib/traffic/fetch-traffic-context";
import {
  estimateTrafficFromCoordinates,
  type GeoPoint,
} from "../lib/traffic/resolve-place-coordinates";
import { resolveSyncTrafficContext } from "../lib/plan-context/resolve-sync-traffic-context";

const seoul: GeoPoint = { lat: 37.5547, lng: 126.9707, label: "서울역" };
const gangnam: GeoPoint = { lat: 37.4979, lng: 127.0276, label: "강남역" };

const estimated = estimateTrafficFromCoordinates(seoul, gangnam);
assert.ok(estimated.travel_minutes >= 8);
assert.ok(estimated.delay_minutes >= 0);

async function main() {
  const heuristic = await fetchTrafficContext({
    destination: "강남역",
    originHint: "대전",
  });
  assert.ok(heuristic.travel_minutes >= 8);
  assert.equal(typeof heuristic.distance_label, "string");

  const fallbackOnly = resolveSyncTrafficContext("강남역", "대전");
  assert.equal(fallbackOnly.travel_minutes, 102);

  console.log("test-traffic-context: ok");
}

void main();
