#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { generateActionCandidatesSync } from "../lib/llm-action-candidate-generator/generate-action-candidates";
import {
  filterCandidatesForPlanGate,
  inferPlanMode,
  isPersonalVitalityCandidate,
  resolvePlanSignalGate,
} from "../lib/plan-context/resolve-plan-signal-gate";
import type { PlanContext } from "../lib/plan-context/plan-context-types";

const groupPlan: PlanContext = {
  title: "오사카 여행",
  windowStartIso: "2027-06-12T09:00:00+09:00",
  windowConfidence: "open",
  peerDisplayName: "민수",
  attachMode: "new",
};

assert.equal(inferPlanMode(groupPlan), "group");
const groupGate = resolvePlanSignalGate(groupPlan);
assert.equal(groupGate.allowPersonalVitality, false);
assert.equal(groupGate.allowLlmVitalitySignals, false);

assert.equal(
  isPersonalVitalityCandidate({
    label: "커피 한잔 후 이동",
    plugin: "vitality.coffee",
    reason: "fatigue recovery",
  }),
  true,
);

const filtered = filterCandidatesForPlanGate(
  [
    {
      id: "a",
      label: "커피 한잔",
      plugin: "vitality.coffee",
      category_hint: "auxiliary",
      reason: "personal condition",
      source: "rules",
    },
    {
      id: "b",
      label: "길찾기",
      plugin: "navigation",
      category_hint: "main",
      reason: "departure timing",
      source: "rules",
    },
  ],
  groupGate,
);
assert.equal(filtered.length, 1);
assert.equal(filtered[0]!.plugin, "navigation");

const soloSync = generateActionCandidatesSync("ec-solo", {
  title: "오사카 여행",
  location: "오사카",
  minutes_until_event: 90,
  spawn_phase: "travel",
  planMode: "solo",
});
assert.ok(soloSync.candidates.length > 0);

const groupSync = generateActionCandidatesSync("ec-group", {
  title: "오사카 여행",
  location: "오사카",
  minutes_until_event: 90,
  spawn_phase: "travel",
  planMode: "group",
});
assert.ok(groupSync.candidates.length > 0);
assert.ok(
  !groupSync.candidates.some((row) => isPersonalVitalityCandidate(row)),
);

console.log("test-plan-signal-gate: ok");
