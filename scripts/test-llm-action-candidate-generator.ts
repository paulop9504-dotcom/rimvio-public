#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  detectCandidateDomain,
  generateActionCandidatesSync,
  mergeCandidatePools,
  normalizeLlmCandidates,
} from "../lib/llm-action-candidate-generator";
import { sanitizePluginId, isRegisteredPlugin } from "../lib/plugin-registry";

assert.equal(detectCandidateDomain("오사카 해외여행"), "travel");
assert.equal(detectCandidateDomain("강남 파트너 미팅"), "work");

const travel = generateActionCandidatesSync("trip-1", {
  title: "오사카 3박4일",
  minutes_until_event: 300,
});
assert.equal(travel.domain, "travel");
assert.ok(travel.candidates.some((item) => item.plugin === "passport.check"));
assert.ok(travel.candidates.some((item) => item.plugin === "roaming.esim"));

const work = generateActionCandidatesSync("meet-1", {
  title: "중요 파트너사 외부 미팅 (강남역)",
  location: "강남역",
  minutes_until_event: 45,
  spawn_phase: "travel",
});
assert.equal(work.domain, "work");
assert.ok(work.candidates.some((item) => item.label.includes("카카오T")));

assert.equal(sanitizePluginId("not.real.plugin", "travel"), "search.web");
assert.ok(isRegisteredPlugin("finance.fx"));

const normalized = normalizeLlmCandidates({
  ecId: "x",
  domain: "travel",
  wire: {
    action_candidates: [
      {
        label: "오사카 도착 후 IC카드 충전",
        plugin: "transit.ic_card",
        category_hint: "auxiliary",
      },
      {
        label: "invalid plugin test",
        plugin: "fake.plugin",
        category_hint: "auxiliary",
      },
    ],
  },
});
assert.equal(normalized[0]?.plugin, "transit.ic_card");
assert.equal(normalized[1]?.plugin, "search.web");

const merged = mergeCandidatePools(normalized, travel.candidates);
assert.ok(merged.length >= travel.candidates.length);

console.log("test-llm-action-candidate-generator: ok");
