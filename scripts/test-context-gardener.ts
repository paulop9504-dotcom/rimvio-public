#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { upsertEventCandidate } from "@/lib/events/event-store";
import { enableLodgingHubForContext } from "@/lib/globe/context-hub/enable-lodging-hub-for-context";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import {
  markContextResourceDone,
  organizeAndCommitContextGarden,
  organizeContextGarden,
} from "@/lib/globe/context-gardener";
import { readContextGardenSnapshot } from "@/lib/globe/context-gardener/read-context-garden";
import { rankContextResources } from "@/lib/globe/resource/rank-context-resources";

function seedShanghaiTrip() {
  const stamp = new Date().toISOString();
  return upsertEventCandidate({
    id: "test-garden-shanghai",
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
  let event = seedShanghaiTrip();
  event = await enableLodgingHubForContext({ contextEventId: event.id });

  const panel = listContextHubServicesForEvent(event);
  assert.ok(panel);

  const ranked = rankContextResources({
    event,
    services: panel.services,
    lat: 36.35,
    lng: 127.38,
    now: new Date("2026-06-15T12:00:00.000Z"),
  });
  assert.ok(ranked.length >= 1);

  const snapshot = organizeContextGarden({
    event,
    ranked,
    services: panel.services,
    now: new Date("2026-06-15T12:00:00.000Z"),
  });

  assert.ok(snapshot.summary.headlineKo.includes("상하이"));
  assert.ok(snapshot.summary.linesKo.some((line) => line.includes("숙소")));
  assert.ok(snapshot.subGroups.length >= 1);
  assert.ok(snapshot.hotResourceId);
  assert.equal(snapshot.coldResourceIds.length, ranked.length - 1);

  const committed = organizeAndCommitContextGarden({
    event,
    ranked,
    services: panel.services,
    now: new Date("2026-06-15T12:00:00.000Z"),
  });
  assert.equal(committed.changed, true);
  const stored = readContextGardenSnapshot(committed.event);
  assert.ok(stored);
  assert.equal(stored!.hotResourceId, snapshot.hotResourceId);

  const hotId = snapshot.hotResourceId!;
  const doneEvent = markContextResourceDone({
    event: committed.event,
    resourceId: hotId,
    now: new Date("2026-06-15T12:00:00.000Z"),
  });
  const afterDone = readContextGardenSnapshot(doneEvent);
  assert.ok(afterDone?.archivedResourceIds.includes(hotId));

  const reranked = rankContextResources({
    event: doneEvent,
    services: panel.services,
    lat: 36.35,
    lng: 127.38,
    now: new Date("2026-06-15T12:00:00.000Z"),
  });
  assert.ok(!reranked.some((row) => row.resource.resourceId === hotId));

  console.log("test-context-gardener: ok");
}

void run();
