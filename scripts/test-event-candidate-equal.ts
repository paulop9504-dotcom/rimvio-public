import assert from "node:assert/strict";
import { eventCandidateContentEqual } from "../lib/events/event-candidate-equal";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  resetEventCandidatesForTests,
  upsertEventCandidate,
} from "../lib/events/event-store";

function baseEvent(): EventCandidate {
  return {
    id: "evt-1",
    title: "제주",
    category: "travel",
    source: "system",
    lifecycle: "candidate",
    datetime: "2026-07-01T10:00:00+09:00",
    place: "제주",
    confidence: 1,
    metadata: { foo: "bar" },
    lifecycleUpdatedAt: "2026-06-01T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

function main() {
  const left = baseEvent();
  const right = { ...left, updatedAt: "2026-06-02T00:00:00.000Z" };
  assert.equal(eventCandidateContentEqual(left, right), true);

  const changed = { ...left, title: "부산" };
  assert.equal(eventCandidateContentEqual(left, changed), false);

  resetEventCandidatesForTests();
  let emitCount = 0;
  if (typeof window !== "undefined") {
    const handler = () => {
      emitCount += 1;
    };
    window.addEventListener("rimvio-event-candidates-updated", handler);
    upsertEventCandidate({
      id: "evt-1",
      title: "제주",
      category: "travel",
      source: "system",
      lifecycle: "candidate",
      confidence: 1,
      metadata: { foo: "bar" },
    });
    upsertEventCandidate({
      id: "evt-1",
      title: "제주",
      category: "travel",
      source: "system",
      lifecycle: "candidate",
      confidence: 1,
      metadata: { foo: "bar" },
    });
    window.removeEventListener("rimvio-event-candidates-updated", handler);
    assert.equal(emitCount, 1, "no-op upsert should not re-emit");
  }

  console.log("test-event-candidate-equal: ok");
}

main();
