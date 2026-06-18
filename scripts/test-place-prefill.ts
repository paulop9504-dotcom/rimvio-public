#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { upsertEventCandidate } from "@/lib/events/event-store";
import { resetLearningRollupForTests } from "@/lib/archive/learning-rollup-store";
import { buildPlacePrefillPlan } from "@/lib/globe/place-history/build-place-prefill-plan";
import { recordPlaceHubLearning } from "@/lib/globe/place-history/record-place-hub-learning";
import { shouldOfferPlacePrefill } from "@/lib/globe/place-history/should-offer-place-prefill";
import { listPlaceSuccessPatterns } from "@/lib/globe/place-history/infer-place-success-patterns";
import { applyWeatherRankMutation } from "@/lib/globe/weather/apply-weather-rank-mutation";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";

function seedShanghaiTrip() {
  const stamp = new Date().toISOString();
  return upsertEventCandidate({
    id: "test-shanghai-prefill",
    title: "상하이 여행",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: "2026-09-01T09:00:00.000Z",
    place: "상하이",
    description: "",
    metadata: { feedPlanEnabled: true },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

function run() {
  resetLearningRollupForTests();

  const prior = upsertEventCandidate({
    id: "test-shanghai-prior",
    title: "상하이 지난 여행",
    category: "travel",
    source: "manual",
    lifecycle: "archived",
    datetime: "2025-05-01T09:00:00.000Z",
    place: "상하이",
    description: "",
    metadata: { feedPlanEnabled: true },
    confidence: 0.9,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  recordPlaceHubLearning({ event: prior, hubId: "lodging", kind: "executed" });
  recordPlaceHubLearning({ event: prior, hubId: "lodging", kind: "executed" });

  const patterns = listPlaceSuccessPatterns("상하이");
  assert.ok(patterns.some((row) => row.hubId === "lodging"));

  const trip = seedShanghaiTrip();
  assert.equal(shouldOfferPlacePrefill(trip), true);
  const plan = buildPlacePrefillPlan(trip);
  assert.ok(plan);
  assert.ok(plan!.lineKo.includes("숙소"));

  const mockRanked: RankedContextResource[] = [
    {
      resource: {
        resourceId: "a:ticket",
        contextEventId: trip.id,
        kind: "ticket",
        sourceHubId: "ticket",
        label: "티켓",
        spacetime: {},
        action: null,
        createdAtIso: stampIso(),
      },
      hubRow: { serviceId: "ticket" } as RankedContextResource["hubRow"],
      rankScore: 100,
    },
    {
      resource: {
        resourceId: "a:lodging",
        contextEventId: trip.id,
        kind: "lodging_voucher",
        sourceHubId: "lodging",
        label: "숙소 A",
        spacetime: {},
        action: null,
        createdAtIso: stampIso(),
      },
      hubRow: { serviceId: "lodging" } as RankedContextResource["hubRow"],
      rankScore: 90,
    },
  ];

  const hot = applyWeatherRankMutation({
    event: {
      ...trip,
      metadata: { ...trip.metadata, executionProfileId: "theme_park_day" },
    },
    ranked: mockRanked,
    tempC: 32,
  });
  assert.equal(hot[0]?.resource.kind, "lodging_voucher");

  console.log("test-place-prefill: ok");
}

function stampIso() {
  return new Date().toISOString();
}

run();
