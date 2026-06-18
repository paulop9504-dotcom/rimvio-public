#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { detectEventCandidate } from "../lib/events/event-candidate";
import { emitEventCandidate } from "../lib/events/emit-event-candidate";
import {
  listEventCandidates,
  resetEventCandidatesForTests,
  upsertEventCandidate,
} from "../lib/events/event-store";
import { orchestrateUserMessage } from "../lib/action-chat/orchestrate-user-message";

const REF = "2026-05-31";

function testDetection() {
  const dentist = detectEventCandidate({
    message: "내일 치과 있는데",
    referenceDate: REF,
  });
  assert.ok(dentist, "dentist message must detect event");
  assert.equal(dentist!.title, "치과");
  assert.equal(dentist!.category, "schedule");
  assert.equal(dentist!.lifecycle, "mentioned");
  assert.ok(dentist!.datetime?.startsWith("2026-06-01"));

  const social = detectEventCandidate({
    message: "엄마 생신",
    referenceDate: REF,
  });
  assert.ok(social, "birthday message must detect event");
  assert.equal(social!.title, "엄마 생신");
  assert.equal(social!.category, "social");

  const finance = detectEventCandidate({
    message: "비트코인 8천 오면",
    referenceDate: REF,
  });
  assert.ok(finance, "finance alert must detect event");
  assert.equal(finance!.title, "BTC Alert");
  assert.equal(finance!.category, "finance");
  assert.equal(finance!.metadata?.alert, true);

  const noise = detectEventCandidate({
    message: "안녕하세요",
    referenceDate: REF,
  });
  assert.equal(noise, null, "greeting must not detect event");
}

function testStore() {
  resetEventCandidatesForTests();
  const draft = detectEventCandidate({
    message: "내일 치과 있는데",
    referenceDate: REF,
  });
  const wire = emitEventCandidate(draft);
  assert.ok(wire);
  upsertEventCandidate({
    id: wire!.id,
    title: wire!.title,
    category: wire!.category,
    source: wire!.source,
    lifecycle: wire!.lifecycle,
    datetime: wire!.datetime,
    place: wire!.place,
    containerId: wire!.container_id,
    confidence: wire!.confidence,
    metadata: wire!.metadata,
    lifecycleUpdatedAt: wire!.lifecycle_updated_at,
  });
  const items = listEventCandidates();
  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "치과");
  resetEventCandidatesForTests();
}

async function testPipelineEarlyReturn() {
  const result = await orchestrateUserMessage({
    message: "내일 치과 있는데",
    masterContext: { currentDate: REF },
  });

  assert.ok(result.eventCandidateUpsert, "PlaceConfirm early return must still emit EventCandidate");
  assert.equal(result.eventCandidateUpsert.title, "치과");
  assert.equal(result.eventCandidateUpsert.category, "schedule");
  assert.equal(result.eventCandidateUpsert.lifecycle, "mentioned");
  assert.ok(
    result.orchestratorTrace?.some((line) => line.includes("EventDetection")),
    "trace must include EventDetection"
  );
}

async function main() {
  testDetection();
  testStore();
  await testPipelineEarlyReturn();
  console.log("test-event-candidate: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
