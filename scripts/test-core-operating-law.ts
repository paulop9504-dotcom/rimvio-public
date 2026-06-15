#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildCoreOperatingLawPromptBlock } from "../lib/action-chat/core-operating-law";
import { buildLayeredMasterOrchestratorSystemPrompt } from "../lib/action-chat/layered-system-prompt";
import { buildMasterOrchestratorSystemPrompt } from "../lib/action-chat/master-orchestrator-prompt";
import { buildFallbackRecoveryPromptBlock } from "../lib/action-chat/fallback-recovery/apply-fallback-recovery";
import { masterContextFromApiPayload } from "../lib/action-chat/client-master-context";
import { eventStateToIntentRoute } from "../lib/action-chat/intent-router";
import { buildConversationEventState } from "../lib/action-chat/conversation-event-state";

const law = buildCoreOperatingLawPromptBlock();

assert.match(law, /CORE OPERATING LAW/u);
assert.match(law, /NOT a free-form conversational AI/u);
assert.match(law, /No dead end/u);
assert.match(law, /Intent-first/u);
assert.match(law, /Commit signals/u);
assert.match(law, /Context restore/u);
assert.match(law, /Vitality override/u);
assert.match(law, /Rimvio golden rule/u);
assert.doesNotMatch(law, /A\/B\/C overload.*A\/B\/C overload/u);

const fallback = buildFallbackRecoveryPromptBlock();
assert.match(fallback, /CORE OPERATING LAW/u);
assert.doesNotMatch(fallback, /잠시 문제가 있어요/u);

const mc = masterContextFromApiPayload({
  currentDate: "2026-06-06",
  trustLevel: "L1",
});
const route = eventStateToIntentRoute(
  buildConversationEventState({ message: "배고파", history: [] })
);

const conv = buildLayeredMasterOrchestratorSystemPrompt({
  context: mc,
  route,
  message: "배고파",
  mode: "conversation",
});
assert.ok(conv.indexOf("[CORE OPERATING LAW]") < conv.indexOf("[FALLBACK RECOVERY"));
assert.ok(conv.indexOf("[CORE OPERATING LAW]") < conv.indexOf("[ADAPTIVE PERSONA"));

const action = buildMasterOrchestratorSystemPrompt({ message: "배고파" });
assert.ok(action.indexOf("[CORE OPERATING LAW]") < action.indexOf("Role: Rimvio"));

console.log("test-core-operating-law: ok");
