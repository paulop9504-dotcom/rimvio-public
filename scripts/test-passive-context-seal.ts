#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { upsertEventCandidate } from "@/lib/events/event-store";
import {
  buildPassiveLocationCareTitle,
  inferExecutionProfileFromText,
  sealVerifiedPassiveContext,
} from "@/lib/globe/passive-context";
import {
  buildPrepChecklistState,
  shouldOfferPrepChecklist,
  stampExecutionProfileOnEvent,
} from "@/lib/globe/prep";
import { markFeedCapturesVerified } from "@/lib/feed/feed-capture-metadata";
import { EXECUTION_PROFILE_META_KEY, PASSIVE_CONTEXT_SEALED_AT_META_KEY } from "@/lib/globe/passive-context/types";

function seedGpsDwellEvent() {
  const stamp = new Date().toISOString();
  return upsertEventCandidate({
    id: "test-gps-dwell-seal",
    title: "디즈니랜드 · 3시간",
    category: "travel",
    source: "system",
    lifecycle: "active",
    datetime: "2026-06-14T10:00:00.000Z",
    place: "상하이 디즈니랜드",
    description: "",
    metadata: {
      targetingSource: "gps_background",
      gpsDwellLat: 31.1433,
      gpsDwellLng: 121.657,
      gpsDwellPlaceLabel: "상하이 디즈니랜드",
      gpsDwellMinutes: 180,
      ...markFeedCapturesVerified({}),
    },
    confidence: 0.72,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

function run() {
  assert.equal(inferExecutionProfileFromText("상하이 디즈니랜드"), "theme_park_day");

  const title = buildPassiveLocationCareTitle({
    place: "상하이 디즈니랜드",
    datetimeIso: "2026-06-14T10:00:00.000Z",
    now: new Date("2026-06-15T09:00:00.000Z"),
  });
  assert.ok(title.includes("어제"));

  let event = seedGpsDwellEvent();
  event = sealVerifiedPassiveContext(event, new Date("2026-06-15T09:00:00.000Z"));
  assert.ok(event.metadata?.[PASSIVE_CONTEXT_SEALED_AT_META_KEY]);
  assert.equal(event.metadata?.globePlaceConfirmed, true);
  assert.equal(event.metadata?.[EXECUTION_PROFILE_META_KEY], "theme_park_day");

  const disneyTrip = upsertEventCandidate({
    id: "test-disney-day-trip",
    title: "디즈니랜드 투어",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    place: "상하이",
    description: "",
    metadata: { feedPlanEnabled: true },
    confidence: 0.9,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const stamped = stampExecutionProfileOnEvent({
    event: disneyTrip,
    label: "디즈니랜드 투어",
  });
  assert.equal(stamped.metadata?.[EXECUTION_PROFILE_META_KEY], "theme_park_day");
  assert.ok(shouldOfferPrepChecklist(stamped));
  const checklist = buildPrepChecklistState({ event: stamped });
  assert.ok(checklist);
  assert.ok(checklist!.items.some((row) => row.id === "power_bank"));

  console.log("test-passive-context-seal: ok");
}

run();
