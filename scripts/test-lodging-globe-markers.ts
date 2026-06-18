import assert from "node:assert/strict";
import { enableLodgingHubForContext } from "@/lib/globe/context-hub/enable-lodging-hub-for-context";
import {
  projectLodgingGlobeMarkers,
  shouldRenderLodgingGlobeMarkers,
} from "@/lib/globe/context-hub/project-lodging-globe-markers";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { rankContextResources } from "@/lib/globe/resource/rank-context-resources";
import { upsertEventCandidate } from "@/lib/events/event-store";

function seedDaejeonTrip() {
  const stamp = "2026-06-15T08:00:00.000Z";
  return upsertEventCandidate({
    id: "test-lodging-globe-markers",
    title: "대전 여행",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: "2026-06-20T09:00:00.000Z",
    place: "대전",
    description: "",
    metadata: {
      feedPlanEnabled: true,
      globePlaceLat: 36.3504,
      globePlaceLng: 127.3845,
    },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

async function run() {
  assert.equal(shouldRenderLodgingGlobeMarkers("space"), false);
  assert.equal(shouldRenderLodgingGlobeMarkers("city"), true);

  seedDaejeonTrip();
  const event = await enableLodgingHubForContext({
    contextEventId: "test-lodging-globe-markers",
  });
  const panel = listContextHubServicesForEvent(event);
  assert.ok(panel);

  const ranked = rankContextResources({
    event,
    services: panel.services,
    lat: 36.362,
    lng: 127.359,
  });

  const markers = projectLodgingGlobeMarkers({ ranked });
  assert.ok(markers.length >= 3);
  assert.equal(markers[0]?.isMain, true);
  assert.ok(markers.every((row) => row.markerKind === "lodging"));
  assert.ok(markers.every((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng)));

  const focused = projectLodgingGlobeMarkers({
    ranked,
    activeResourceId: markers[1]?.resourceId,
  });
  assert.equal(focused[1]?.isMain, true);
  assert.equal(focused[0]?.isMain, false);

  console.log("test-lodging-globe-markers: ok");
}

void run();
