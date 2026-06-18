import assert from "node:assert/strict";
import { fetchPlacesLodgingNearby } from "@/lib/globe/context-hub/fetch-places-lodging-nearby";
import { loadLodgingInventoryRows } from "@/lib/globe/context-hub/load-lodging-inventory-rows";
import { isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import { upsertEventCandidate } from "@/lib/events/event-store";
import type { EventCandidate } from "@/lib/events/event-candidate";

function seedOsakaTrip(): EventCandidate {
  const stamp = "2026-06-15T08:00:00.000Z";
  return upsertEventCandidate({
    id: "test-places-lodging-osaka",
    title: "오사카",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: "2026-07-20T09:00:00.000Z",
    place: "오사카",
    description: "",
    metadata: {
      feedPlanEnabled: true,
      globePlaceLat: 34.6937,
      globePlaceLng: 135.5023,
    },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

async function run() {
  const event = seedOsakaTrip();
  const loaded = await loadLodgingInventoryRows({
    event,
    lat: 34.6937,
    lng: 135.5023,
  });

  assert.ok(loaded.rows.length >= 1);
  if (isGooglePlacesConfigured()) {
    assert.equal(loaded.source, "google_places");
    assert.equal(loaded.rows[0]?.partnerLabel, "google_places");
  } else {
    assert.equal(loaded.source, "mock");
  }

  const nearby = await fetchPlacesLodgingNearby({
    lat: 34.6937,
    lng: 135.5023,
    maxResults: 3,
  });
  if (isGooglePlacesConfigured()) {
    assert.ok(nearby.length >= 1);
    assert.ok(nearby.every((row) => row.placeId && row.name && row.lat && row.lng));
  } else {
    assert.equal(nearby.length, 0);
  }

  console.log("test-places-lodging-fetch: ok");
}

void run();
