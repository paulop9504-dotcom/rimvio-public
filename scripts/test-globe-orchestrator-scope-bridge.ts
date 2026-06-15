#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import {
  buildGlobeComposerScopeBlock,
  resolvePinScopeFromCluster,
  resolvePinScopeFromEventId,
} from "../lib/globe/globe-orchestrator-scope-bridge";
import type { PinCluster } from "../lib/globe/pin-cluster-types";
import { stampUniversalPinMetadata } from "../lib/globe/stamp-universal-pin-metadata";

function cluster(partial: Partial<PinCluster> & Pick<PinCluster, "eventId">): PinCluster {
  return {
    pinId: `pin:${partial.eventId}`,
    title: partial.title ?? "Test",
    placeLabel: partial.placeLabel ?? "Seoul",
    lat: partial.lat ?? 37.5,
    lng: partial.lng ?? 127.0,
    dateLabel: null,
    startedAtIso: null,
    evidence: {
      photoCount: 0,
      videoCount: 0,
      chatCount: 0,
      placePinCount: 0,
    },
    recallLine: null,
    ...partial,
  };
}

resetEventCandidatesForTests();

const privateEvent = commitEventUpsert({
  id: "ec-scope-private",
  title: "Private trace",
  category: "experience",
  source: "manual",
  lifecycle: "active",
  metadata: stampUniversalPinMetadata({ sourceText: "제주 여행" }),
});

assert.equal(resolvePinScopeFromEventId(privateEvent.id), "internal");
assert.equal(
  resolvePinScopeFromCluster(cluster({ eventId: privateEvent.id })),
  "internal",
);

const externalEvent = commitEventUpsert({
  id: "ec-scope-external",
  title: "Shared trace",
  category: "experience",
  source: "manual",
  lifecycle: "active",
  metadata: stampUniversalPinMetadata({
    sourceText: "번개 모임",
    scope: "external",
  }),
});

assert.equal(resolvePinScopeFromEventId(externalEvent.id), "external");
assert.equal(
  resolvePinScopeFromCluster(cluster({ eventId: externalEvent.id })),
  "external",
);

assert.equal(
  resolvePinScopeFromCluster(
    cluster({ eventId: "ext-trace-1", origin: "external", readOnly: true }),
  ),
  "external",
);

const block = buildGlobeComposerScopeBlock({
  pinScope: "external",
  eventId: externalEvent.id,
  title: "Shared trace",
});
assert.match(block, /pin_scope:\s*external/u);
assert.match(block, /eventId:\s*ec-scope-external/u);

console.log("test-globe-orchestrator-scope-bridge: ok");
