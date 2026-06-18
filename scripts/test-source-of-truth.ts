#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { masterContextFromApiPayload } from "../lib/action-chat/client-master-context";
import {
  buildTruthProjections,
  hydrateEventStoreFromTruthWire,
} from "../lib/source-of-truth";
import { toEventCandidateWire } from "../lib/events/emit-event-candidate";
import {
  listEventCandidates,
  resetEventCandidatesForTests,
} from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetEventCandidatesForTests([]);
commitEventUpsert({
  title: "점심 약속",
  category: "schedule",
  source: "message",
  lifecycle: "scheduled",
  datetime: "2026-06-05T12:00:00",
  confidence: 0.9,
});

const events = listEventCandidates();
const wire = events.map(toEventCandidateWire);

const staleSchedule = [{ time: "09:00", task: "잘못된 일정" }];
const ctx = masterContextFromApiPayload({
  currentDate: "2026-06-05",
  trustLevel: 1,
  eventCandidates: wire,
  existingSchedule: staleSchedule,
});

assert.equal(ctx.existingSchedule.length, 1);
assert.equal(ctx.existingSchedule[0]?.task, "점심 약속");

hydrateEventStoreFromTruthWire([]);
assert.equal(listEventCandidates().length, 0);

const projected = buildTruthProjections(events, "2026-06-05");
assert.equal(projected.allReminders[0]?.title, "점심 약속");

resetEventCandidatesForTests([]);
console.log("test-source-of-truth: ok");
