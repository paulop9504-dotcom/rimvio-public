#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildResourceDismissedEvent,
  buildResourceImpressionEvent,
  buildResourceManualPickEvent,
} from "../lib/telemetry/build-curation-telemetry-event";
import { hashTelemetryUserId } from "../lib/telemetry/hash-telemetry-user-id";
import type { RankedContextResource } from "../lib/globe/resource/map-hub-service-to-resource";

const entry: RankedContextResource = {
  rankScore: 220,
  hubRow: {
    serviceId: "ticket",
    labelKo: "티켓",
    shortLabelKo: "QR",
    implemented: true,
    offered: true,
    connected: true,
    link: {
      eventId: "ec-park",
      kind: "departure_airport",
      label: "QR",
      shortLabel: "QR",
      airportIata: null,
      actionUrl: "https://ticket.example.com",
      actionLabelKo: "QR 보기",
    },
    flightOptions: [],
    handoffHref: "blob:qr",
    handoffLabelKo: "QR 보기",
  },
  resource: {
    resourceId: "ec-park:ticket",
    contextEventId: "ec-park",
    kind: "ticket",
    sourceHubId: "ticket",
    label: "QR 보기",
    shortLabel: "QR",
    spacetime: {
      validFromIso: "2026-06-15T09:00:00.000Z",
      validUntilIso: null,
      placeLabel: "둔산동",
      lat: 36.35,
      lng: 127.38,
    },
    action: { kind: "show_qr", href: "blob:qr", labelKo: "QR 보기" },
    createdAtIso: "2026-06-15T08:00:00.000Z",
  },
};

const userSeed = "test-user-uuid";
const hashed = hashTelemetryUserId(userSeed);
assert.match(hashed, /^u_[0-9a-f]{8}$/);

const impression = buildResourceImpressionEvent({
  contextId: "ec-park",
  entry,
  lat: 36.35,
  lng: 127.38,
  userSeed,
});
assert.equal(impression.event_type, "RESOURCE_IMPRESSION");
assert.equal(impression.carousel_index, 0);
assert.equal(impression.surface, "carousel_main");
assert.equal(impression.user_id, hashed);
assert.equal(impression.context_id, "ec-park");
assert.equal(impression.resource_id, "ec-park:ticket");
assert.equal(impression.event_lat, 36.35);

const nativeMain = buildResourceImpressionEvent({
  contextId: "ec-park",
  entry,
  lat: 36.35,
  lng: 127.38,
  userSeed,
  surface: "native_main",
});
assert.equal(nativeMain.surface, "native_main");
assert.equal(nativeMain.resource_id, "ec-park:ticket");

const dismissed = buildResourceDismissedEvent({
  contextId: "ec-park",
  entry,
  lat: 36.35,
  lng: 127.38,
  userSeed,
  dwellTimeMs: 4200,
  dismissReason: "swipe_next",
});
assert.equal(dismissed.event_type, "RESOURCE_DISMISSED");
assert.equal(dismissed.dwell_time, 4200);

const manual = buildResourceManualPickEvent({
  contextId: "ec-park",
  entry,
  lat: 36.35,
  lng: 127.38,
  userSeed,
  carouselIndex: 2,
  systemRankIndex: 1,
});
assert.equal(manual.event_type, "RESOURCE_MANUAL_PICK");
assert.equal(manual.system_rank_index, 1);

console.log("test-curation-telemetry: ok");
