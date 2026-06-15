import assert from "node:assert/strict";
import { isVitalityStateUtterance } from "../lib/vitality-state/classify-vitality-state-intent";
import { parseVitalityStateLlmWire } from "../lib/vitality-state/parse-vitality-state-llm-wire";
import { assessPlaceConfirmationNeed } from "../lib/action-chat/confirmation-logic";
import { resolveNavigationPlaceName } from "../lib/action-chat/resolve-navigation-place";
import { orchestrateVitalityStateIntent } from "../lib/vitality-state/orchestrate-vitality-state-intent";

function wire(kind: string, vitality: string, confidence = 0.9) {
  return JSON.stringify({ is_state: true, kind, vitality, confidence });
}

assert.equal(parseVitalityStateLlmWire(wire("hunger", "Haven"))?.kind, "hunger");
assert.equal(parseVitalityStateLlmWire(wire("hunger", "Haven"))?.protocol, "food_discovery");
assert.equal(parseVitalityStateLlmWire(wire("energy_depletion", "Haven"))?.kind, "energy_depletion");
assert.equal(parseVitalityStateLlmWire(wire("overload", "Sentinel"))?.vitality, "Sentinel");
assert.equal(parseVitalityStateLlmWire(wire("priority_confusion", "Apex"))?.protocol, "apex_golden_path");
assert.equal(parseVitalityStateLlmWire('{"is_state":false}'), null);
assert.equal(parseVitalityStateLlmWire('{"is_state":true,"kind":"invalid"}'), null);

assert.equal(isVitalityStateUtterance("배고파"), true);
assert.equal(isVitalityStateUtterance("졸려"), true);
assert.equal(isVitalityStateUtterance("스트레스"), true);
assert.equal(isVitalityStateUtterance("저녁 뭐 먹을까"), false);
assert.equal(isVitalityStateUtterance("스타벅스"), false);
assert.equal(isVitalityStateUtterance("강남역"), false);
assert.equal(isVitalityStateUtterance("뭐부터 해야 하지?"), true);
assert.equal(resolveNavigationPlaceName("배고파"), null);
assert.equal(assessPlaceConfirmationNeed({ message: "배고파" }), null);

async function main() {
  const hunger = await orchestrateVitalityStateIntent({ message: "배고파" });
  assert.ok(hunger);
  assert.ok(hunger!.summary.includes("배고") || hunger!.summary.includes("맛"));
  assert.equal(hunger!.confirmation, undefined);

  const sleepy = await orchestrateVitalityStateIntent({ message: "졸려" });
  assert.ok(sleepy);
  assert.notEqual(sleepy!.summary, "무엇을 도와드릴까요?");

  const stress = await orchestrateVitalityStateIntent({ message: "스트레스" });
  assert.ok(stress);
  assert.notEqual(stress!.summary, "무엇을 도와드릴까요?");

  console.log("test-vitality-state-intent: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
