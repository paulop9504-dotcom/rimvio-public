import assert from "node:assert/strict";
import { upsertEventCandidate } from "@/lib/events/event-store";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { saveContextTicketArtifact } from "@/lib/globe/context-hub/save-context-ticket-artifact";
import { buildMainNativeSurfacePayload } from "@/lib/globe/resource/build-main-native-surface-payload";
import { MAIN_NATIVE_SURFACE_CONTRACT_VERSION } from "@/lib/globe/resource/main-native-surface";
import { rankContextResources } from "@/lib/globe/resource/rank-context-resources";

function run() {
  const stamp = new Date().toISOString();
  const event = upsertEventCandidate({
    id: "test-native-surface-context",
    title: "콘서트",
    category: "concert",
    source: "manual",
    lifecycle: "planned",
    datetime: "2026-06-20T18:00:00.000Z",
    place: "올림픽공원",
    description: "",
    metadata: { feedPlanEnabled: true },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });

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

  const panel = listContextHubServicesForEvent(saved);
  assert.ok(panel);
  const ranked = rankContextResources({
    event: saved,
    services: panel.services,
    now: new Date("2026-06-20T17:45:00.000Z"),
    lat: 37.5219,
    lng: 127.1214,
  });

  const payload = buildMainNativeSurfacePayload({
    ranked,
    event: saved,
    now: new Date("2026-06-20T17:45:00.000Z"),
  });

  assert.ok(payload);
  assert.equal(payload.contractVersion, MAIN_NATIVE_SURFACE_CONTRACT_VERSION);
  assert.equal(payload.surfaceId, `${saved.id}:ticket`);
  assert.equal(payload.qrImageSrc, "data:image/png;base64,abc");
  assert.equal(payload.preferScanBrightness, true);
  assert.deepEqual(payload.platforms, ["ios_live_activity", "android_ongoing"]);

  const tooEarly = buildMainNativeSurfacePayload({
    ranked,
    event: saved,
    now: new Date("2026-06-19T12:00:00.000Z"),
  });
  assert.equal(tooEarly, null);

  console.log("test-main-native-surface: ok");
}

run();
