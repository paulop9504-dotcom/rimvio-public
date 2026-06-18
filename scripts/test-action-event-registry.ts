import assert from "node:assert/strict";
import {
  evaluateActionEventLifecycle,
  evaluateActionEventRegistry,
} from "../lib/action-event-registry/evaluate-lifecycle";
import { tryExtractActionEventFromMessage } from "../lib/action-event-registry/extract-action-event-from-message";
import { buildDockFromActionEvents } from "../lib/action-event-registry/build-dock-from-events";
import { upsertActionEvent, resetActionEventsForTests } from "../lib/action-event-registry/action-event-store";

resetActionEventsForTests();

const airport = tryExtractActionEventFromMessage({
  message: "내일 10시 인천공항",
  referenceDate: "2026-05-31",
  now: new Date("2026-05-31T12:00:00"),
});
assert.ok(airport);
assert.equal(airport!.kind, "airport_travel");

const record = upsertActionEvent({
  task: "인천공항",
  placeName: "인천공항",
  targetTimeIso: "2026-06-01T10:00:00",
  sourceMessage: "내일 10시 인천공항",
});

const warm = evaluateActionEventLifecycle(record, new Date("2026-06-01T06:00:00"));
assert.equal(warm.lifecycle, "WARM");

const active = evaluateActionEventLifecycle(record, new Date("2026-06-01T08:30:00"));
assert.equal(active.lifecycle, "ACTIVE");

const archived = evaluateActionEventLifecycle(record, new Date("2026-06-01T11:00:00"));
assert.equal(archived.lifecycle, "ARCHIVED");

const visible = evaluateActionEventRegistry([record], new Date("2026-06-01T06:00:00"));
assert.equal(visible.length, 1);
assert.equal(visible[0]!.lifecycle, "WARM");

const dockWarm = buildDockFromActionEvents(visible);
assert.ok(dockWarm.shadow_actions.length >= 1);

const dockActive = buildDockFromActionEvents(
  evaluateActionEventRegistry([record], new Date("2026-06-01T08:30:00"))
);
assert.ok(dockActive.main_action);
assert.equal(dockActive.main_action!.state, "ACTIVE");

console.log("test-action-event-registry: ok");
