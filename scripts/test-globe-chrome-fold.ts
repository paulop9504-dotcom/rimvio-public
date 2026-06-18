#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { ContextHubServiceRow } from "../lib/globe/context-hub/context-hub-service-catalog";
import { resolvePrimaryHubServiceRow } from "../lib/globe/context-hub/resolve-primary-hub-service";

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

const connectedFlight = resolvePrimaryHubServiceRow([
  row({
    serviceId: "ai_search",
    handoffHref: "/search?q=1",
    connected: false,
  }),
  row({
    serviceId: "flight",
    connected: true,
    link: {
      eventId: "hub-1",
      kind: "departure_airport",
      label: "인천",
      shortLabel: "ICN",
      airportIata: "ICN",
      actionUrl: "https://flight.naver.com",
      actionLabelKo: "항공",
    },
  }),
]);
assert.equal(connectedFlight?.serviceId, "flight");

const offered = resolvePrimaryHubServiceRow([
  row({ serviceId: "rental_car", implemented: false, offered: false }),
  row({ serviceId: "ai_search", handoffHref: "/search", connected: false }),
]);
assert.equal(offered?.serviceId, "ai_search");

console.log("test-globe-chrome-fold: ok");
