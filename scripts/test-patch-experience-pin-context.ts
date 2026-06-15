import assert from "node:assert/strict";
import { resetCorrectionLogForTests } from "@/lib/corrections/correction-log";
import { upsertEventCandidate } from "@/lib/events/event-store";
import { patchExperiencePinContext } from "@/lib/globe/patch-experience-pin-context";

function seedEvent() {
  return upsertEventCandidate({
    title: "계산동722",
    category: "social",
    source: "message",
    lifecycle: "confirmed",
    place: "계산동722",
    confidence: 0.7,
    metadata: { feedPlanEnabled: true },
  });
}

async function main() {
  resetCorrectionLogForTests();
  const event = seedEvent();

  const titled = await patchExperiencePinContext(event.id, {
    title: "둔산동 스타벅스 약속",
  });
  assert.equal(titled.title, "둔산동 스타벅스 약속");

  const placed = await patchExperiencePinContext(event.id, {
    place: "둔산동 스타벅스",
  });
  assert.equal(placed.place, "둔산동 스타벅스");
  assert.ok(placed.confidence >= event.confidence);

  console.log("test-patch-experience-pin-context: ok");
}

void main();
