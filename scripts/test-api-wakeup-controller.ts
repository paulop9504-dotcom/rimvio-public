import assert from "node:assert/strict";
import {
  anyWakeupFetchAllowed,
  resolveApiWakeupDecision,
  resolveApiWakeupPhase,
} from "@/lib/globe/resource/api-wakeup-controller";
import { buildApiWakeupContextFromEvent } from "@/lib/globe/resource/build-api-wakeup-context";
import { isResourceSyncStale } from "@/lib/globe/resource/is-resource-sync-stale";
import type { ContextResource } from "@/lib/globe/resource/types";
import type { EventCandidate } from "@/lib/events/event-candidate";

const baseEvent: EventCandidate = {
  id: "evt-japan",
  title: "일본 여행",
  category: "travel",
  source: "manual",
  lifecycle: "planned",
  datetime: "2026-07-20T09:00:00.000Z",
  place: "오사카",
  description: "",
  metadata: { feedPlanEnabled: true, globePlaceLat: 34.6937, globePlaceLng: 135.5023 },
  confidence: 0.9,
  lifecycleUpdatedAt: "2026-06-01T00:00:00.000Z",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

function run() {
  const monthAway = buildApiWakeupContextFromEvent({
    event: baseEvent,
    now: new Date("2026-06-15T12:00:00.000Z"),
  });
  assert.equal(resolveApiWakeupPhase(monthAway), "cold");
  const coldWeather = resolveApiWakeupDecision("weather_forecast", monthAway);
  assert.equal(coldWeather.allowFetch, false);
  assert.equal(coldWeather.pollIntervalMs, null);

  const dayBefore = buildApiWakeupContextFromEvent({
    event: baseEvent,
    now: new Date("2026-07-19T12:00:00.000Z"),
  });
  assert.equal(resolveApiWakeupPhase(dayBefore), "warm");
  const warmWeather = resolveApiWakeupDecision("weather_forecast", dayBefore);
  assert.equal(warmWeather.allowFetch, true);
  assert.equal(warmWeather.pollIntervalMs, 30 * 60 * 1000);

  const atGate = buildApiWakeupContextFromEvent({
    event: baseEvent,
    now: new Date("2026-07-20T08:30:00.000Z"),
    lat: 34.695,
    lng: 135.5,
  });
  assert.equal(resolveApiWakeupPhase(atGate), "hot");

  const queueCold = resolveApiWakeupDecision("queue_times", monthAway);
  assert.equal(queueCold.allowFetch, false);

  const queueHot = resolveApiWakeupDecision("queue_times", atGate);
  assert.equal(queueHot.allowFetch, true);
  assert.equal(queueHot.pollIntervalMs, 5 * 60 * 1000);

  const lodgingCold = resolveApiWakeupDecision("places_lodging", monthAway);
  assert.equal(lodgingCold.allowFetch, false);

  const lodgingWarm = resolveApiWakeupDecision("places_lodging", dayBefore);
  assert.equal(lodgingWarm.allowFetch, true);
  assert.equal(lodgingWarm.pollIntervalMs, 6 * 60 * 60 * 1000);

  const lodgingHot = resolveApiWakeupDecision("places_lodging", atGate);
  assert.equal(lodgingHot.allowFetch, true);
  assert.equal(lodgingHot.pollIntervalMs, 30 * 60 * 1000);

  const ticketCold = resolveApiWakeupDecision("ticket_ingest", monthAway);
  assert.equal(ticketCold.allowFetch, true);
  assert.equal(ticketCold.pollIntervalMs, 24 * 60 * 60 * 1000);

  const resource: ContextResource = {
    resourceId: "evt-japan:ticket",
    contextEventId: "evt-japan",
    kind: "ticket",
    sourceHubId: "ticket",
    label: "입장 QR",
    spacetime: { validFromIso: baseEvent.datetime ?? null },
    action: { kind: "show_qr", href: "data:image/png;base64,x", labelKo: "QR" },
    createdAtIso: "2026-06-01T00:00:00.000Z",
    lastSyncedAtIso: "2026-07-20T08:00:00.000Z",
  };
  assert.equal(
    isResourceSyncStale({
      resource,
      phase: "hot",
      now: new Date("2026-07-20T08:06:00.000Z"),
    }),
    true,
  );

  assert.equal(
    anyWakeupFetchAllowed([
      resolveApiWakeupDecision("weather_forecast", monthAway),
      resolveApiWakeupDecision("ticket_ingest", monthAway),
    ]),
    true,
  );

  console.log("test-api-wakeup-controller: ok");
}

run();
