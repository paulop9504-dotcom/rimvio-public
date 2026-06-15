#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  detectMorningTone,
  resolveMorningContext,
  selectTopMorningProviders,
} from "../lib/morning-orchestrator/resolve-morning-context";
import {
  buildRuleBasedMorningBriefing,
  formatMorningBriefingText,
} from "../lib/morning-orchestrator/parse-morning-response";
import {
  isMorningBriefingQuery,
  orchestrateMorningBriefing,
} from "../lib/morning-orchestrator/orchestrate-morning-briefing";
import {
  buildMorningJarvisSystemPrompt,
  buildMorningPartnerSystemPrompt,
} from "../lib/morning-orchestrator/morning-prompt";

async function main() {
  assert.equal(isMorningBriefingQuery("아침 브리핑 해줘"), true);
  assert.equal(isMorningBriefingQuery("자비스 현황 보고"), true);
  assert.equal(isMorningBriefingQuery("조용한 카페 추천"), false);

  assert.equal(detectMorningTone("자비스 모드 브리핑"), "jarvis");
  assert.equal(detectMorningTone("아침 브리핑"), "partner");

  const bundle = await resolveMorningContext({
    message: "아침 브리핑",
    referenceDate: "2026-05-29T07:30:00.000Z",
    hour: 7,
    location: "Seoul",
  });

  assert.equal(bundle.providers.length, 6);
  assert.ok(bundle.providers.some((provider) => provider.id === "weather"));
  assert.ok(bundle.providers.some((provider) => provider.id === "health"));

  const top = selectTopMorningProviders(bundle.providers);
  assert.equal(top.length, 3);

  const partnerWire = buildRuleBasedMorningBriefing(bundle);
  assert.equal(partnerWire.tone, "partner");
  assert.equal(partnerWire.priority_actions.length, 3);
  assert.ok(partnerWire.greeting.length > 0);
  assert.ok(partnerWire.daily_insight.summary.length > 0);
  assert.match(formatMorningBriefingText(partnerWire), /💡/);

  const jarvisBundle = await resolveMorningContext({
    message: "자비스 현황 보고",
    tone: "jarvis",
    hour: 8,
  });
  const jarvisWire = buildRuleBasedMorningBriefing(jarvisBundle);
  assert.equal(jarvisWire.tone, "jarvis");
  assert.match(jarvisWire.greeting, /준비|집계/u);

  const result = await orchestrateMorningBriefing({
    message: "오늘 아침 브리핑 해줘",
    referenceDate: "2026-05-29T07:30:00.000Z",
    hour: 7,
  });
  assert.ok(result);
  assert.ok(result!.morningBriefing);
  assert.equal(result!.morningBriefing!.priority_actions.length, 3);
  assert.ok(result!.actions.length >= 3);

  assert.match(buildMorningPartnerSystemPrompt(), /CARE & ACT/u);
  assert.match(buildMorningJarvisSystemPrompt(), /RIMVIO x JARVIS/u);
  assert.match(buildMorningJarvisSystemPrompt(), /준비했습니다/u);

  console.log("test-morning-orchestrator: ok");
}

void main();
