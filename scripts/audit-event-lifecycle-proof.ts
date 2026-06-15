#!/usr/bin/env npx tsx
import { detectEventCandidate } from "../lib/events/event-candidate";
import { emitEventCandidate, applyEventCandidateUpsertFromApi } from "../lib/events/emit-event-candidate";
import {
  ingestConfirmationSignal,
  ingestScheduleSignal,
} from "../lib/events/event-ingest-pipeline";
import {
  resetEventCandidatesForTests,
  listEventCandidates,
} from "../lib/events/event-store";
import { wireEventCompleted } from "../lib/events/event-lifecycle-hooks";
import { syncEventLifecycle } from "../lib/events/event-lifecycle-runner";
import { ACTIVE_WINDOW_MS, ARCHIVE_WINDOW_MS } from "../lib/events/event-lifecycle";

const REF = "2026-05-31";
const MSG = "내일 치과 있는데";

resetEventCandidatesForTests();

const samples = [
  { message: "내일 치과 있는데", ref: REF },
  { message: "엄마 생신", ref: REF },
  { message: "비트코인 8천 오면", ref: REF },
  { message: "내일 3시 Zoom 미팅", ref: REF },
  { message: "금요일 헬스장", ref: REF },
];

for (const sample of samples) {
  const draft = detectEventCandidate({
    message: sample.message,
    referenceDate: sample.ref,
  });
  if (!draft) continue;
  const wire = emitEventCandidate(draft);
  if (wire) applyEventCandidateUpsertFromApi(wire);
}

const wire = emitEventCandidate(
  detectEventCandidate({ message: MSG, referenceDate: REF })
);
applyEventCandidateUpsertFromApi(wire);

const steps: Array<{ step: string; lifecycle: string; id?: string }> = [];
const e0 = listEventCandidates().find((e) => e.metadata?.sourceMessage === MSG)!;
steps.push({ step: "1. input", lifecycle: e0.lifecycle, id: e0.id });

const e1 = ingestConfirmationSignal({ sourceMessage: MSG })!;
steps.push({ step: "2. 응", lifecycle: e1.lifecycle, id: e1.id });

const e2 = ingestScheduleSignal({
  sourceMessage: MSG,
  datetime: "2026-06-01T17:00:00",
})!;
steps.push({ step: "3. schedule ingest", lifecycle: e2.lifecycle, id: e2.id });

syncEventLifecycle({ now: new Date("2026-06-01T16:30:00"), activeWindowMs: ACTIVE_WINDOW_MS });
const e3 = listEventCandidates().find((e) => e.id === e0.id)!;
steps.push({ step: "4. time proximity", lifecycle: e3.lifecycle, id: e3.id });

const e4 = wireEventCompleted({ eventId: e3.id, actionType: "NAVIGATE" })!;
steps.push({ step: "5. action complete", lifecycle: e4.lifecycle, id: e4.id });

syncEventLifecycle({
  now: new Date(Date.now() + ARCHIVE_WINDOW_MS + 1_000),
  archiveWindowMs: ARCHIVE_WINDOW_MS,
});
const e5 = listEventCandidates().find((e) => e.id === e0.id)!;
steps.push({ step: "6. archive", lifecycle: e5.lifecycle, id: e5.id });

console.log("=== RUNTIME PROOF ===");
console.log(JSON.stringify(steps, null, 2));

console.log("\n=== STORE SAMPLES (5) ===");
console.log(
  JSON.stringify(
    listEventCandidates().slice(0, 5).map((e) => ({
      id: e.id,
      title: e.title,
      lifecycle: e.lifecycle,
      createdAt: e.createdAt,
      lifecycleUpdatedAt: e.lifecycleUpdatedAt,
    })),
    null,
    2
  )
);
