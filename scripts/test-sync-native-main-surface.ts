import assert from "node:assert/strict";
import { upsertEventCandidate } from "@/lib/events/event-store";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { saveContextTicketArtifact } from "@/lib/globe/context-hub/save-context-ticket-artifact";
import { buildMainNativeSurfaceCommand } from "@/lib/globe/resource/build-main-native-surface-payload";
import {
  mainNativeSurfaceRevisionKey,
  shouldDeferNativeMainSurfaceToWeb,
} from "@/lib/globe/resource/sync-native-main-surface";
import { rankContextResources } from "@/lib/globe/resource/rank-context-resources";

function run() {
  const stamp = new Date().toISOString();
  const event = upsertEventCandidate({
    id: "test-sync-native-surface",
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
  });

  const command = buildMainNativeSurfaceCommand({
    ranked,
    event: saved,
    now: new Date("2026-06-20T17:45:00.000Z"),
  });

  assert.ok(command.payload);
  assert.equal(shouldDeferNativeMainSurfaceToWeb(command, true), true);
  assert.equal(shouldDeferNativeMainSurfaceToWeb(command, false), false);

  const endCommand = buildMainNativeSurfaceCommand({
    ranked,
    event: saved,
    now: new Date("2026-06-19T12:00:00.000Z"),
  });
  assert.equal(endCommand.lifecycle, "end");
  assert.equal(shouldDeferNativeMainSurfaceToWeb(endCommand, true), false);

  const revisionKey = mainNativeSurfaceRevisionKey({
    contextEventId: saved.id,
    ranked,
  });
  assert.ok(revisionKey.includes(saved.id));

  console.log("test-sync-native-main-surface: ok");
}

run();
