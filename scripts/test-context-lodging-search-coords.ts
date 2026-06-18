#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { upsertEventCandidate } from "@/lib/events/event-store";
import { loadLodgingInventoryRows } from "@/lib/globe/context-hub/load-lodging-inventory-rows";
import {
  resolveContextLodgingDestinationAnchor,
  resolveContextLodgingSearchCoords,
  shouldPreferUserLocationForLodgingSync,
} from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";
import {
  isLodgingInventoryMisanchored,
  readLodgingInventoryRows,
} from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { commitLodgingInventoryToEvent } from "@/lib/globe/context-hub/commit-lodging-inventory";
import { DAEJEON_LODGING_MOCK } from "@/lib/globe/context-hub/lodging-mock-inventory";
import { haversineKm } from "@/lib/feed/spacetime-fit";

function seedShanghaiTrip(): ReturnType<typeof upsertEventCandidate> {
  const stamp = new Date().toISOString();
  return upsertEventCandidate({
    id: "test-shanghai-lodging-coords",
    title: "상하이 여행",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: "2026-08-01T09:00:00.000Z",
    place: "상하이",
    description: "",
    metadata: { feedPlanEnabled: true },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

async function run() {
  const event = seedShanghaiTrip();
  const anchor = resolveContextLodgingDestinationAnchor(event);

  assert.ok(haversineKm(anchor.lat, anchor.lng, 31.2304, 121.4737) < 50, "near Shanghai");

  const searchFromKorea = resolveContextLodgingSearchCoords(event, {
    lat: 36.35,
    lng: 127.38,
    preferUserLocation: true,
  });
  assert.ok(searchFromKorea);
  assert.ok(
    haversineKm(searchFromKorea!.lat, searchFromKorea!.lng, anchor.lat, anchor.lng) < 50,
    "Korea GPS must not override Shanghai context",
  );

  assert.equal(
    shouldPreferUserLocationForLodgingSync({
      event,
      lat: 36.35,
      lng: 127.38,
    }),
    false,
  );

  const loaded = await loadLodgingInventoryRows({
    event,
    lat: 36.35,
    lng: 127.38,
    preferUserLocation: true,
  });

  assert.ok(loaded.rows.length >= 1);
  for (const row of loaded.rows) {
    assert.ok(
      haversineKm(row.lat, row.lng, anchor.lat, anchor.lng) < 30,
      `${row.name} should sit near context anchor, not Korea`,
    );
  }

  const stale = commitLodgingInventoryToEvent({
    event,
    inventory: [...DAEJEON_LODGING_MOCK],
    inventorySource: "mock",
  });
  assert.equal(isLodgingInventoryMisanchored(stale), true);
  assert.equal(readLodgingInventoryRows(stale).length, DAEJEON_LODGING_MOCK.length);

  console.log("test-context-lodging-search-coords: ok");
}

void run();
