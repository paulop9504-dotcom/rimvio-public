#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { rankContextHubServices } from "../lib/globe/context-hub/rank-context-hub-services";
import type { ContextHubServiceRow } from "../lib/globe/context-hub/context-hub-service-catalog";
import { resolvePrimaryHubServiceRow } from "../lib/globe/context-hub/resolve-primary-hub-service";
import { rankContextResources } from "../lib/globe/resource/rank-context-resources";

function row(
  partial: Partial<ContextHubServiceRow> & Pick<ContextHubServiceRow, "serviceId">,
): ContextHubServiceRow {
  return {
    serviceId: partial.serviceId,
    labelKo: partial.labelKo ?? partial.serviceId,
    shortLabelKo: partial.shortLabelKo ?? partial.serviceId,
    implemented: partial.implemented ?? true,
    offered: partial.offered ?? true,
    connected: partial.connected ?? false,
    link: partial.link ?? null,
    flightOptions: partial.flightOptions ?? [],
    handoffHref: partial.handoffHref ?? null,
    handoffLabelKo: partial.handoffLabelKo ?? null,
  };
}

const ranked = rankContextHubServices([
  row({ serviceId: "ai_search", handoffHref: "/search", connected: true }),
  row({
    serviceId: "flight",
    connected: true,
    link: {
      eventId: "h1",
      kind: "departure_airport",
      label: "ICN",
      shortLabel: "ICN",
      airportIata: "ICN",
      actionUrl: "https://flight.naver.com",
      actionLabelKo: "항공",
    },
  }),
  row({
    serviceId: "ticket",
    connected: true,
    handoffHref: "blob:qr-preview",
    handoffLabelKo: "QR 보기",
    link: {
      eventId: "h1",
      kind: "departure_airport",
      label: "티켓",
      shortLabel: "QR",
      actionUrl: "https://ticket.example.com",
      actionLabelKo: "티켓",
    },
  }),
]);
assert.equal(ranked[0]?.serviceId, "ticket");
assert.equal(resolvePrimaryHubServiceRow(ranked)?.serviceId, "ticket");

const now = new Date("2026-06-15T10:00:00.000Z");
const parkEvent: EventCandidate = {
  id: "ec-park",
  title: "놀이공원",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  confidence: 0.9,
  lifecycleUpdatedAt: now.toISOString(),
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  datetime: "2026-06-15T09:00:00.000Z",
  place: "둔산동",
  metadata: {
    feedPlanEnabled: true,
    globeManualContext: true,
    globePlaceLat: 36.35,
    globePlaceLng: 127.38,
  },
};

const parkAtVenue = rankContextResources({
  event: parkEvent,
  services: ranked,
  now,
  lat: 36.35,
  lng: 127.38,
});
assert.equal(parkAtVenue[0]?.resource.kind, "ticket");
assert.ok((parkAtVenue[0]?.rankScore ?? 0) > (parkAtVenue[1]?.rankScore ?? 0));

const parkRemote = rankContextResources({
  event: parkEvent,
  services: ranked,
  now,
  lat: 37.56,
  lng: 126.98,
});
assert.equal(parkRemote[0]?.resource.kind, "ticket");

console.log("test-globe-hub-carousel: ok");
