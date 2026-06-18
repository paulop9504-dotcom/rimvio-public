import assert from "node:assert/strict";
import { readContextTicketArtifact } from "@/lib/globe/context-hub/read-context-ticket-artifact";
import { saveContextTicketArtifact } from "@/lib/globe/context-hub/save-context-ticket-artifact";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { rankContextResources } from "@/lib/globe/resource/rank-context-resources";
import { isTicketQrViewerHref } from "@/lib/globe/ticket-scan-surface";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { upsertEventCandidate } from "@/lib/events/event-store";

function seedEvent(): EventCandidate {
  const stamp = new Date().toISOString();
  return upsertEventCandidate({
    id: "test-ticket-context",
    title: "콘서트",
    category: "concert",
    source: "manual",
    lifecycle: "planned",
    datetime: "2026-06-20T18:00:00.000Z",
    place: "올림픽공원",
    description: "",
    metadata: {
      feedPlanEnabled: true,
      globePlaceLat: 37.5219,
      globePlaceLng: 127.1214,
    },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

function run() {
  const event = seedEvent();
  const saved = saveContextTicketArtifact({
    contextEventId: event.id,
    artifact: {
      labelKo: "입장 QR",
      actionUrl: null,
      qrPreviewUrl: "data:image/png;base64,abc",
      validFromIso: "2026-06-20T17:30:00.000Z",
      validUntilIso: "2026-06-20T21:00:00.000Z",
      placeLabel: "올림픽공원",
    },
  });

  const artifact = readContextTicketArtifact(saved);
  assert.ok(artifact);
  assert.equal(artifact.labelKo, "입장 QR");
  assert.equal(artifact.validFromIso, "2026-06-20T17:30:00.000Z");
  assert.equal(artifact.placeLabel, "올림픽공원");

  const panel = listContextHubServicesForEvent(saved);
  assert.ok(panel);
  const ticketRow = panel.services.find((row) => row.serviceId === "ticket");
  assert.ok(ticketRow?.handoffHref?.startsWith("data:image"));

  const ranked = rankContextResources({
    event: saved,
    services: panel.services,
    now: new Date("2026-06-20T17:45:00.000Z"),
    lat: 37.5219,
    lng: 127.1214,
  });
  assert.equal(ranked[0]?.hubRow.serviceId, "ticket");

  assert.equal(isTicketQrViewerHref("data:image/png;base64,x"), true);
  assert.equal(isTicketQrViewerHref("https://x.com/t.png"), true);
  assert.equal(isTicketQrViewerHref("https://ticket.example/pass"), false);

  console.log("test-context-ticket-artifact: ok");
}

run();
