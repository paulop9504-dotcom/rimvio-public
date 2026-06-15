import assert from "node:assert/strict";
import { loadMatchingTemplates } from "../lib/action-template/match-template";
import { mergeTemplatesRuleBased, applyMergedWireToBase } from "../lib/action-template/merge-template-rule";
import { instantiateTemplate } from "../lib/action-template/instantiate-template";
import { instanceToDockWire } from "../lib/action-template/run-template-merge-pipeline";
import {
  resetTemplateInstanceStoreForTests,
  getLatestTemplateInstance,
} from "../lib/action-template/template-instance-store";
import { resetTripStoreForTests, upsertTripFromMessage } from "../lib/trip-controller/trip-store";

resetTemplateInstanceStoreForTests();
resetTripStoreForTests();

// Load — 도쿄 3박 4일 → trip_basic_001
const tokyoTemplates = loadMatchingTemplates("도쿄 3박 4일 여행 계획");
assert.ok(tokyoTemplates.some((t) => t.template_id === "trip_basic_001"));

// Transform — rule merge adds 돼지코 for Japan
const merged = mergeTemplatesRuleBased({
  templates: tokyoTemplates,
  message: "도쿄 3박 4일 여행",
});
assert.ok(merged.added_items.some((item) => /돼지코|엔화|와이파이/u.test(item.item)));

// Instantiate
const instance = instantiateTemplate({
  templates: tokyoTemplates,
  merged,
  message: "도쿄 3박 4일",
});
assert.ok(instance.instance_id.startsWith("user_"));
assert.ok(instance.items.some((item) => item.item === "여권" && item.mandatory));
assert.ok(instance.actions.some((action) => action.id === "packing_list"));

// Inheritance — 출장 = trip + work
const businessTemplates = loadMatchingTemplates("이번엔 일본 출장이야");
assert.ok(businessTemplates.some((t) => t.template_id === "trip_basic_001"));
assert.ok(businessTemplates.some((t) => t.template_id === "work_basic_001"));

const businessMerged = mergeTemplatesRuleBased({
  templates: businessTemplates,
  message: "이번엔 일본 출장이야",
});
const { actions, items } = applyMergedWireToBase({
  templates: businessTemplates,
  merged: businessMerged,
});
assert.ok(items.some((item) => item.item === "여권"));
assert.ok(actions.some((action) => action.id === "expense"));

// Pipeline end-to-end (sync rule path)
const pipelineTemplates = loadMatchingTemplates("도쿄 3박 4일 여행 짐 싸야 해");
const pipelineMerged = mergeTemplatesRuleBased({
  templates: pipelineTemplates,
  message: "도쿄 3박 4일 여행 짐 싸야 해",
});
const pipelineInstance = instantiateTemplate({
  templates: pipelineTemplates,
  merged: pipelineMerged,
  message: "도쿄 3박 4일 여행 짐 싸야 해",
});
assert.ok(pipelineInstance);

// Dock from instance
const dock = instanceToDockWire(instance);
assert.equal(dock.main_action?.label, "짐 체크리스트");
assert.ok(dock.shadow_actions.some((action) => action.label === "날씨 확인"));

// Trip store integration
const trip = upsertTripFromMessage({
  message: "도쿄 3박 4일 출장",
  referenceDate: "2026-06-10",
})!;
assert.ok(trip.templateInstanceId);
assert.ok(trip.packing!.items.some((item) => item.item === "여권"));
const stored = getLatestTemplateInstance();
assert.ok(stored);

console.log("test-action-template: ok");
