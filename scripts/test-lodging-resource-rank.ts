import assert from "node:assert/strict";
import { findEventCandidate, upsertEventCandidate } from "@/lib/events/event-store";
import { enableLodgingHubForContext } from "@/lib/globe/context-hub/enable-lodging-hub-for-context";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { DAEJEON_LODGING_MOCK } from "@/lib/globe/context-hub/lodging-mock-inventory";
import {
  rankContextResources,
  filterLodgingRankedResources,
} from "@/lib/globe/resource/rank-context-resources";

async function run() {
  const stamp = "2026-06-15T08:00:00.000Z";
  upsertEventCandidate({
    id: "test-daejeon-trip",
    title: "대전 출장",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: "2026-06-20T15:00:00.000Z",
    place: "대전",
    description: "",
    metadata: { feedPlanEnabled: true },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });

  await enableLodgingHubForContext({ contextEventId: "test-daejeon-trip" });
  const event = findEventCandidate("test-daejeon-trip");
  assert.ok(event);

  const panel = listContextHubServicesForEvent(event);
  assert.ok(panel);

  const nearYuseong = rankContextResources({
    event,
    services: panel.services,
    now: new Date("2026-06-20T14:00:00.000Z"),
    lat: 36.355,
    lng: 127.298,
  });

  const lodgingNear = filterLodgingRankedResources(nearYuseong);
  assert.equal(lodgingNear.length, DAEJEON_LODGING_MOCK.length);
  assert.equal(lodgingNear[0]?.resource.label, "유성온천 스파 호텔");

  const nearStation = rankContextResources({
    event,
    services: panel.services,
    now: new Date("2026-06-20T14:00:00.000Z"),
    lat: 36.332,
    lng: 127.435,
  });
  assert.equal(
    filterLodgingRankedResources(nearStation)[0]?.resource.label,
    "대전역 센트럴 스테이",
  );

  console.log("test-lodging-resource-rank: ok");
}

void run();
