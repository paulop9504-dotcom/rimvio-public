import assert from "node:assert/strict";
import { findEventCandidate, upsertEventCandidate } from "@/lib/events/event-store";
import { connectDepartureHubToContext } from "@/lib/globe/connect-departure-hub-to-context";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { readResourceLastSyncedAtIso } from "@/lib/globe/resource/context-resource-sync-metadata";
import { planHubResourceSyncJobs } from "@/lib/globe/resource/plan-hub-resource-sync-jobs";
import { rankContextResources } from "@/lib/globe/resource/rank-context-resources";
import { runHubResourceSyncWorker } from "@/lib/globe/resource/run-hub-resource-sync-worker";

function seedTripEvent() {
  const stamp = "2026-07-19T08:00:00.000Z";
  return upsertEventCandidate({
    id: "test-sync-worker-trip",
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
  const event = seedTripEvent();
  const connected = connectDepartureHubToContext({
    destinationEventId: event.id,
    airportId: "icn",
  }).destinationEvent;

  const panel = listContextHubServicesForEvent(connected);
  assert.ok(panel);

  const ranked = rankContextResources({
    event: connected,
    services: panel.services,
    now: new Date("2026-07-19T12:00:00.000Z"),
    lat: 37.4602,
    lng: 126.4407,
  });

  const monthAwayJobs = planHubResourceSyncJobs({
    ranked,
    event: connected,
    now: new Date("2026-06-01T00:00:00.000Z"),
  });
  assert.equal(
    monthAwayJobs.filter((job) => job.providerId === "flight_status").length,
    0,
  );
  assert.ok(
    monthAwayJobs.every((job) => job.providerId === "ticket_ingest"),
    "cold allows ticket ingest only",
  );

  const warmJobs = planHubResourceSyncJobs({
    ranked,
    event: connected,
    now: new Date("2026-07-19T12:00:00.000Z"),
    lat: 37.4602,
    lng: 126.4407,
  });
  assert.ok(warmJobs.length >= 1);
  assert.equal(warmJobs[0]?.isMain, true);

  const worker = await runHubResourceSyncWorker({
    ranked,
    event: connected,
    now: new Date("2026-07-19T12:00:00.000Z"),
    lat: 37.4602,
    lng: 126.4407,
  });
  assert.ok(worker.synced.length >= 1);

  const after = findEventCandidate(connected.id);
  assert.ok(after);
  const flightSync = readResourceLastSyncedAtIso(after, "flight");
  assert.ok(flightSync);

  const repeat = await runHubResourceSyncWorker({
    ranked,
    event: after,
    now: new Date("2026-07-19T12:01:00.000Z"),
    lat: 37.4602,
    lng: 126.4407,
  });
  assert.equal(repeat.synced.length, 0);

  console.log("test-hub-resource-sync-worker: ok");
}

void run();
