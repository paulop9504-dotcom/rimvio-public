#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  isGlobeManualContextEvent,
  pruneExpiredEvents,
} from "../lib/events/event-lifecycle";

const NOW = Date.parse("2026-06-10T12:00:00Z");
const OLD_ISO = "2024-01-01T10:00:00+09:00";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  const stamp = "2026-06-10T03:00:00.000Z";
  return {
    id: "evt:test",
    title: "테스트",
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime: OLD_ISO,
    confidence: 0.9,
    metadata: {},
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function testManualContextNotPruned() {
  const manual = baseEvent({
    id: "plan:jeju:1704067200000",
    metadata: {
      globeManualContext: true,
      targetingSource: "globe_manual",
    },
  });
  const stale = baseEvent({
    id: "moment:1704067200000",
    metadata: { autoIngested: true },
  });

  const kept = pruneExpiredEvents([manual, stale], NOW);
  assert.equal(kept.length, 1);
  assert.equal(kept[0]?.id, manual.id);
  assert.equal(isGlobeManualContextEvent(manual), true);
  assert.equal(isGlobeManualContextEvent(stale), false);
}

testManualContextNotPruned();
console.log("test-globe-manual-context-prune: ok");
