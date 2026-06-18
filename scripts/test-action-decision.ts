#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { splitMainAuxActions } from "../lib/action-decision/split-main-aux-actions";

const airportCandidates = [
  { id: "taxi", label: "카카오T 호출", action_type: "TAXI" },
  { id: "invite", label: "청첩장 보기", action_type: "LINK" },
  { id: "nav", label: "길찾기 보기", action_type: "NAVIGATE" },
  { id: "park", label: "주차 등록", action_type: "PARKING" },
];

const imminent = splitMainAuxActions({
  candidates: airportCandidates,
  minutes_until_event: 25,
});

assert.ok(imminent.primary_action);
assert.equal(imminent.primary_action!.label, "카카오T 호출");
assert.equal(imminent.primary_action!.type, "MAIN");
assert.equal(imminent.primary_action!.plugin, "kakao.taxi");
assert.ok(imminent.secondary_actions.every((action) => action.type === "AUX"));
assert.ok(imminent.secondary_actions.some((action) => action.label === "길찾기 보기"));

const farAway = splitMainAuxActions({
  candidates: airportCandidates,
  minutes_until_event: 48 * 60,
});

assert.equal(
  farAway.primary_action?.label ?? null,
  null,
  "far from event — no MAIN unless state-change execution",
);
assert.ok(farAway.secondary_actions.length > 0);

const readOnlyOnly = splitMainAuxActions({
  candidates: [
    { id: "check", label: "일정 확인", action_type: "CHECK" },
    { id: "pdf", label: "PDF 보기", action_type: "LINK" },
  ],
  minutes_until_event: 10,
});

assert.equal(readOnlyOnly.primary_action, null, "read-only cannot be MAIN");
assert.equal(readOnlyOnly.secondary_actions.length, 2);

console.log("test-action-decision: ok");
