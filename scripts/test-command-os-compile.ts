#!/usr/bin/env npx tsx
import {
  compileCommandToEventOs,
  enableDeterministicCommandIdsForTests,
  parseCommandInput,
  resetCommandEventCandidatesForTests,
  resolveIntent,
} from "../lib/command-os";
import { resetProofPersistStoreForTests } from "../lib/event-os/runtime/proof-persist-store";
import { resetReviewExecutionQueueForTests } from "../lib/event-os/review-execution-queue-state";
import { resetReviewExecutionLocksForTests } from "../lib/event-os/review-execution-lock";
import { eventOSOrchestrator } from "../lib/event-os/runtime/event-os-orchestrator";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

resetCommandEventCandidatesForTests();
enableDeterministicCommandIdsForTests();
resetReviewExecutionQueueForTests();
resetReviewExecutionLocksForTests();
resetProofPersistStoreForTests();
eventOSOrchestrator.resetRuntimeCountersForTests();

const parsed = parseCommandInput("@캘린더 14시 병원");
if (!parsed || parsed.command !== "캘린더" || parsed.query !== "14시 병원") {
  fail(`parse:${JSON.stringify(parsed)}`);
}

const intent = resolveIntent("캘린더", "14시 병원");
if (intent.intent !== "CREATE_EVENT") {
  fail(`intent_calendar:${intent.intent}`);
}

const windowIntent = resolveIntent("새창", "병원 예약");
if (windowIntent.intent !== "OPEN_WINDOW") {
  fail(`intent_window:${windowIntent.intent}`);
}

const actionIntent = resolveIntent("액션", "길찾기");
if (actionIntent.intent !== "ACTION_QUERY") {
  fail(`intent_action:${actionIntent.intent}`);
}

const calendar = compileCommandToEventOs("@캘린더 14시 병원");
if (calendar.candidate.intent !== "CREATE_EVENT") {
  fail(`compile_intent:${calendar.candidate.intent}`);
}
if (calendar.candidate.extractedContext.time !== "14:00") {
  fail(`compile_time:${calendar.candidate.extractedContext.time}`);
}
if (calendar.candidate.extractedContext.subject !== "병원") {
  fail(`compile_subject:${calendar.candidate.extractedContext.subject}`);
}
if (!calendar.runtime.processed[0]?.proof?.proofHash) {
  fail("compile_proof_missing");
}

try {
  compileCommandToEventOs("캘린더 14시");
  fail("should_reject_non_at_syntax");
} catch {
  // expected
}

const search = compileCommandToEventOs("@검색 강남 맛집");
if (search.candidate.intent !== "SEARCH") {
  fail(`search_intent:${search.candidate.intent}`);
}

console.log(
  JSON.stringify(
    {
      status: violations.length === 0 ? "PASS" : "FAIL",
      violations,
      calendarCandidate: calendar.candidate,
      proofHash: calendar.runtime.processed[0]?.proof.proofHash,
    },
    null,
    2
  )
);

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-command-os-compile: ok");
