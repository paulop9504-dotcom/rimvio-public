#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { orchestrateUserMessage } from "../lib/action-chat/orchestrate-user-message";
import { compileExperienceChoiceWire } from "../lib/experience/compile-experience-choice";
import {
  inferExperienceMode,
  isEfficiencyTrapInSocialContext,
} from "../lib/experience/infer-experience-mode";
import { orchestrateExperienceGuidance } from "../lib/experience/orchestrate-experience-guidance";
import { rankPlaceCandidatesByMemory } from "../lib/context-resolver/places/rank-by-memory-relevance";
import { memoryScheduleKeepBias } from "../lib/experience/apply-memory-schedule-bias";
import { scoreScheduleTradeoff } from "../lib/schedule/score-schedule-tradeoff";
import { derivePresentationWire } from "../lib/presentation/presentation-mode";
import type { PlaceCandidate } from "../lib/context-resolver/places/types";
import type { ScheduleEventBlock } from "../lib/schedule/schedule-block-types";

const jejuIceCream =
  "친구들이랑 제주인데 아이스크림 편의점에서 사도 될까?";

assert.equal(inferExperienceMode(jejuIceCream), "MEMORY");
assert.ok(isEfficiencyTrapInSocialContext(jejuIceCream));

const wire = compileExperienceChoiceWire(jejuIceCream);
assert.ok(wire);
assert.equal(wire?.action, "ASK_CHOICE");
assert.equal(wire?.mode, "MEMORY");
assert.ok((wire?.options.length ?? 0) >= 3);
assert.ok(wire?.options.some((option) => /친구|물어보/u.test(option.label)));

const guided = orchestrateExperienceGuidance(jejuIceCream);
assert.ok(guided);
assert.equal(guided?.presentation?.mode, "EXPERIENCE_CHOICE");
assert.ok(guided?.experienceChoice);
assert.match(guided?.summary ?? "", /함께|경험|싸게/u);
assert.ok((guided?.actions.length ?? 0) >= 3);

assert.deepEqual(
  derivePresentationWire({ experienceChoice: { action: "ASK_CHOICE" } }),
  { mode: "EXPERIENCE_CHOICE" }
);

const candidates: PlaceCandidate[] = [
  {
    place_id: "cvs",
    name: "GS25 제주",
    address: null,
    lat: 33.4,
    lng: 126.5,
    rating: 4,
    open_now: true,
    vibes: [],
    phone: null,
    maps_url: null,
    naver_category: "편의점",
    description: "가까운 편의점",
  },
  {
    place_id: "view-cafe",
    name: "해변 뷰 카페",
    address: null,
    lat: 33.41,
    lng: 126.51,
    rating: 4.5,
    open_now: true,
    vibes: [],
    phone: null,
    maps_url: null,
    naver_category: "카페·디저트",
    description: "바다 전망 좋은 카페",
  },
];

const ranked = rankPlaceCandidatesByMemory(candidates);
assert.equal(ranked[0]?.place_id, "view-cafe");

const hair: ScheduleEventBlock = {
  id: "hair",
  title: "둔산동 헤어숍",
  vitality: "Haven",
  priority: "normal",
  startMinutes: 14 * 60,
  durationMinutes: 60,
  rescheduleCost: 3,
  source: "message",
};

const meeting: ScheduleEventBlock = {
  id: "meeting",
  title: "중요한 미팅",
  vitality: "Nexus",
  priority: "high",
  startMinutes: 14 * 60 + 30,
  durationMinutes: 60,
  rescheduleCost: 8,
  source: "message",
};

assert.ok(memoryScheduleKeepBias(meeting, "MEMORY") > memoryScheduleKeepBias(hair, "MEMORY"));

const balanced = scoreScheduleTradeoff(hair, meeting, "BALANCED");
const memory = scoreScheduleTradeoff(hair, meeting, "MEMORY");
assert.equal(balanced.moveEventId, memory.moveEventId);
assert.ok(memory.keepScoreB >= balanced.keepScoreB);

async function main() {
  const orchestrated = await orchestrateUserMessage({ message: jejuIceCream });
  assert.equal(orchestrated.presentation?.mode, "EXPERIENCE_CHOICE");
  assert.ok(orchestrated.experienceChoice);
  assert.equal(orchestrated.cafeDiscovery, undefined);
  console.log("test-experience-mode: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
