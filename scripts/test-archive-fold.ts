#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  appendActionTelemetry,
  resetActionTelemetryForTests,
} from "../lib/archive/action-telemetry-store";
import {
  findArchivedEventByEventId,
  listArchivedEvents,
  resetArchiveStoreForTests,
} from "../lib/archive/archive-store";
import { buildArchivedEvent } from "../lib/archive/build-archived-event";
import { foldArchivedEvent } from "../lib/archive/fold-archived-event";
import {
  findLearningRollupEntry,
  resetLearningRollupForTests,
} from "../lib/archive/learning-rollup-store";
import {
  resetEventCandidatesForTests,
  transitionEventLifecycle,
} from "../lib/events/event-store";
import { isArchiveFoldPending } from "../lib/events/fold-archived-event";
import type { EventCandidate } from "../lib/events/event-candidate";

const NOW = "2026-06-01T18:00:00.000Z";

function seedEvent(partial: Partial<EventCandidate> = {}): EventCandidate {
  return {
    id: partial.id ?? "ec-archive-test",
    title: partial.title ?? "치과",
    category: partial.category ?? "schedule",
    source: partial.source ?? "message",
    lifecycle: partial.lifecycle ?? "completed",
    datetime: partial.datetime ?? "2026-06-01T17:00:00",
    place: partial.place,
    confidence: partial.confidence ?? 0.9,
    metadata: partial.metadata ?? { sourceRef: "action-event-registry" },
    lifecycleUpdatedAt: partial.lifecycleUpdatedAt ?? NOW,
    createdAt: partial.createdAt ?? NOW,
    updatedAt: partial.updatedAt ?? NOW,
  };
}

function resetStores() {
  resetActionTelemetryForTests([]);
  resetArchiveStoreForTests([]);
  resetLearningRollupForTests([]);
  resetEventCandidatesForTests([]);
}

function testPureBuildArchivedEvent() {
  resetStores();
  const event = seedEvent();
  appendActionTelemetry({
    eventId: event.id,
    actionId: "navigate-main",
    label: "길찾기",
    tier: "MAIN",
    kind: "shown",
    at: "2026-06-01T16:00:00.000Z",
  });
  appendActionTelemetry({
    eventId: event.id,
    actionId: "navigate-main",
    label: "길찾기",
    tier: "MAIN",
    kind: "clicked",
    at: "2026-06-01T16:01:00.000Z",
  });

  const archived = buildArchivedEvent({
    event,
    telemetry: [
      {
        id: "tel-1",
        eventId: event.id,
        actionId: "navigate-main",
        label: "길찾기",
        tier: "MAIN",
        kind: "shown",
        at: "2026-06-01T16:00:00.000Z",
      },
      {
        id: "tel-2",
        eventId: event.id,
        actionId: "navigate-main",
        label: "길찾기",
        tier: "MAIN",
        kind: "clicked",
        at: "2026-06-01T16:01:00.000Z",
      },
    ],
    archivedAt: NOW,
    archiveId: `${event.id}:archived:${NOW}`,
  });

  assert.equal(archived.event.eventId, event.id);
  assert.equal(archived.executionSummary.clickedCount, 1);
  assert.ok(archived.mainActionHistory.length + archived.auxiliaryActionHistory.length >= 1);
}

function testFoldWritesArchiveAndRollup() {
  resetStores();
  const event = seedEvent({ id: "ec-fold-write" });
  resetEventCandidatesForTests([event]);

  appendActionTelemetry({
    eventId: event.id,
    actionId: "navigate-main",
    label: "길찾기",
    tier: "MAIN",
    kind: "shown",
  });
  appendActionTelemetry({
    eventId: event.id,
    actionId: "navigate-main",
    label: "길찾기",
    tier: "MAIN",
    kind: "executed",
  });

  const archived = transitionEventLifecycle(event.id, "archived");
  assert.ok(archived);
  assert.equal(archived!.lifecycle, "archived");
  assert.equal(isArchiveFoldPending(archived!), false);
  assert.ok(typeof archived!.metadata?.archiveFoldedAt === "string");
  assert.ok(typeof archived!.metadata?.archiveId === "string");

  const stored = findArchivedEventByEventId(event.id);
  assert.ok(stored);
  assert.equal(stored!.archiveId, archived!.metadata?.archiveId);
  assert.equal(listArchivedEvents().length, 1);

  const rollup = findLearningRollupEntry(
    stored!.behaviorSnapshot.contextKey,
    stored!.learningSignals[0]!.actionKey,
  );
  assert.ok(rollup);
  assert.ok(rollup!.executed >= 1);
}

function testFoldIdempotent() {
  resetStores();
  const event = seedEvent({ id: "ec-fold-idempotent" });
  resetEventCandidatesForTests([event]);

  const first = foldArchivedEvent({ ...event, lifecycle: "archived" });
  const second = foldArchivedEvent({ ...event, lifecycle: "archived" });

  assert.equal(first.folded, true);
  assert.equal(second.folded, true);
  assert.equal(first.archiveId, second.archiveId);
  assert.equal(listArchivedEvents().length, 1);
}

function main() {
  testPureBuildArchivedEvent();
  testFoldWritesArchiveAndRollup();
  testFoldIdempotent();
  console.log("test-archive-fold: ok");
}

main();
