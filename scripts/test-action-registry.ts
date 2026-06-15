import assert from "node:assert/strict";
import {
  recordTemplateUsage,
  resetActionRegistryForTests,
  runTemplatePromotionPass,
  upsertLearningTemplate,
} from "../lib/action-registry/action-registry-store";
import {
  buildArchitectWireFromTemplate,
  buildAvailableTemplatesMarkdown,
  matchActionTemplate,
  architectWireToDockWire,
} from "../lib/action-registry/match-template";
import { parseActionArchitectWire } from "../lib/action-registry/parse-action-architect";
import { computePredictiveDock, visibleDockActions } from "../lib/predictive-dock/compute-predictive-dock";

resetActionRegistryForTests();

// Tier 1 — manual core airport template
const airportMatch = matchActionTemplate({ message: "내일 10시 인천공항 출발" });
assert.ok(airportMatch);
assert.equal(airportMatch!.tier, "MANUAL_CORE");
assert.equal(airportMatch!.template.id, "AIRPORT_TRAVEL_01");

const airportWire = architectWireToDockWire(
  buildArchitectWireFromTemplate(airportMatch!, "내일 10시 인천공항 출발", 120)
);
assert.ok(airportWire.main_action);
assert.equal(airportWire.main_action!.templateId, "AIRPORT_TRAVEL_01");
assert.ok(airportWire.shadow_actions.some((item) => item.label === "항공권"));

// Promotion — usage_count >= 3 → PROMOTED
const learned = upsertLearningTemplate({
  contextKey: "친구 저녁 식사",
  category: "Nexus",
  scenario: "friend_dinner",
  main_action: {
    type: "SAVE",
    label: "식당 예약",
    prompt: "식당 예약해줘",
    priority: 90,
  },
  shadow_actions: [
    { type: "SHARE", label: "카톡 위치 공유", prompt: "카톡으로 위치 공유해줘", score: 80 },
  ],
});

for (let index = 0; index < 3; index += 1) {
  recordTemplateUsage(learned.id);
}
const promoted = runTemplatePromotionPass().find((item) => item.id === learned.id);
assert.ok(promoted);
assert.equal(promoted!.template_status, "PROMOTED");

const learnedMatch = matchActionTemplate({ message: "오늘 저녁 친구 저녁 식사 약속" });
assert.ok(learnedMatch);
assert.equal(learnedMatch!.tier, "LEARNED_TEMPLATE");

// Available templates markdown includes manual + promoted learned
const markdown = buildAvailableTemplatesMarkdown([promoted!]);
assert.match(markdown, /AIRPORT_TRAVEL_01/u);
assert.match(markdown, /\[AVAILABLE TEMPLATES\]/u);

// Parse Action Architect JSON from LLM wire
const parsed = parseActionArchitectWire({
  thought: "Dynamic inference for gym",
  strategy_applied: "DYNAMIC_INFERENCE",
  template_id: null,
  message: "오늘 헬스장 가는 날이에요.",
  main_action: { type: "LIST", label: "운동 루틴", priority: 92 },
  shadow_actions: [{ type: "SAVE", label: "기록지", score: 75 }],
});
assert.ok(parsed);
assert.equal(parsed!.strategy_applied, "DYNAMIC_INFERENCE");
assert.equal(parsed!.main_action?.label, "운동 루틴");

// Dock prefers Tier 1 template over generic schedule heuristics
const dock = computePredictiveDock({
  messages: [],
  schedule: [],
  referenceDate: "2026-06-03",
  lastUserMessage: "내일 김포공항 비행기",
  now: new Date("2026-06-02T08:00:00.000Z"),
});
const visible = visibleDockActions(dock);
assert.ok(visible.length > 0);
assert.equal(visible[0]!.templateId, "AIRPORT_TRAVEL_01");

console.log("test-action-registry: ok");
