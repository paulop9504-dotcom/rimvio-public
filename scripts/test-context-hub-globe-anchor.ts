#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { upsertEventCandidate } from "@/lib/events/event-store";
import { saveContextTicketArtifact } from "@/lib/globe/context-hub/save-context-ticket-artifact";
import { hasActiveContextHub } from "@/lib/globe/context-hub/has-active-context-hub";
import {
  projectContextHubGlobeAnchor,
  shouldRenderContextHubGlobeAnchor,
} from "@/lib/globe/context-hub/project-context-hub-globe-anchor";

function run() {
  const stamp = new Date().toISOString();
  const event = upsertEventCandidate({
    id: "test-hub-anchor-context",
    title: "제주 여행",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: "2026-06-20T09:00:00.000Z",
    place: "성산일출봉",
    description: "",
    metadata: {
      feedPlanEnabled: true,
      globePlaceLat: 33.458,
      globePlaceLng: 126.942,
    },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });

  assert.equal(hasActiveContextHub(event), false);

  const saved = saveContextTicketArtifact({
    contextEventId: event.id,
    artifact: {
      labelKo: "입장 QR",
      actionUrl: null,
      qrPreviewUrl: "data:image/png;base64,abc",
      validFromIso: "2026-06-20T08:30:00.000Z",
      validUntilIso: "2026-06-20T12:00:00.000Z",
      placeLabel: "성산일출봉",
    },
  });

  assert.equal(hasActiveContextHub(saved), true);

  const anchor = projectContextHubGlobeAnchor({
    event: saved,
    lat: 33.458,
    lng: 126.942,
  });

  assert.ok(anchor);
  assert.equal(anchor?.contextEventId, saved.id);
  assert.equal(anchor?.markerKind, "context_hub");
  assert.ok(anchor!.lat > 33.458);
  assert.ok(anchor!.lng > 126.942);

  assert.equal(shouldRenderContextHubGlobeAnchor("neighborhood"), true);
  assert.equal(shouldRenderContextHubGlobeAnchor("space"), false);

  console.log("test-context-hub-globe-anchor: ok");
}

run();
