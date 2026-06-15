#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  resetActionEventsForTests,
  upsertActionEvent,
  listActionEventRecords,
} from "../lib/action-event-registry/action-event-store";
import { buildActionCalendar } from "../lib/calendar/build-action-calendar";
import { composeActionProjection } from "../lib/action-projection/compose-action-projection";
import { projectActionCalendarChips } from "../lib/action-projection/project-action-calendar";
import {
  listEventCalendarRows,
  projectEventCalendarChips,
} from "../lib/events/project-event-calendar";
import {
  listEventCandidates,
  resetEventCandidatesForTests,
  transitionEventLifecycle,
} from "../lib/events/event-store";
import { isArchiveFoldPending } from "../lib/events/fold-archived-event";
import { findArchivedEventByEventId, resetArchiveStoreForTests } from "../lib/archive/archive-store";
import { resetActionTelemetryForTests } from "../lib/archive/action-telemetry-store";
import { resetLearningRollupForTests } from "../lib/archive/learning-rollup-store";

const NOW = new Date("2026-06-01T08:00:00");

resetActionEventsForTests();
resetEventCandidatesForTests([]);
resetArchiveStoreForTests([]);
resetActionTelemetryForTests([]);
resetLearningRollupForTests([]);

const record = upsertActionEvent({
  task: "인천공항",
  placeName: "인천공항",
  targetTimeIso: "2026-06-01T10:00:00",
  sourceMessage: "오늘 10시 인천공항",
});

assert.ok(record.id.startsWith("ec-"), "ActionEvent upsert must write EventCandidate id");
assert.equal(listActionEventRecords().length, 1);
assert.equal(listEventCandidates().length, 1);

const eventChips = projectEventCalendarChips(listEventCalendarRows(), NOW);
const actionChips = projectActionCalendarChips(
  composeActionProjection({ now: NOW }).entries,
  NOW,
);
const calendar = buildActionCalendar({
  eventChips,
  projectionActionChips: actionChips,
  streamActions: [],
  knowledgeEntities: [],
  now: NOW,
});

assert.ok(calendar.rowCount >= 1);
const tiered = calendar.overlayRows.find(
  (row) => row.overlayActions.some((action) => action.action_tier === "MAIN"),
);
assert.ok(tiered, "engine calendar path must apply MAIN/AUX tiering in prep window");

resetEventCandidatesForTests([
  {
    id: "ec-fold-gate",
    title: "치과",
    category: "schedule",
    source: "message",
    lifecycle: "completed",
    datetime: "2026-06-01T17:00:00",
    confidence: 0.9,
    metadata: {},
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]);

const archived = transitionEventLifecycle("ec-fold-gate", "archived");
assert.ok(archived);
assert.equal(archived!.lifecycle, "archived");
assert.equal(isArchiveFoldPending(archived!), false);
assert.ok(typeof archived!.metadata?.archiveFoldedAt === "string");
assert.ok(findArchivedEventByEventId("ec-fold-gate"));
assert.equal(listEventCandidates().length, 1, "freshly folded archived rows stay until prune window");

console.log("test-engine-alignment: ok");
