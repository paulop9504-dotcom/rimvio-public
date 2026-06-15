#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { orchestrateByRules } from "../lib/action-chat/rule-orchestrator";
import { orchestrateConversation } from "../lib/action-chat/conversation-turns";
import { parseOrchestratorJson, wireActionsToLinkItems } from "../lib/action-chat/wire-to-actions";
import {
  applyDisclosureToOrchestratorResult,
  isUserConfirmingActions,
  resolveDisclosureTier,
} from "../lib/action-chat/action-confidence";

const place = orchestrateByRules({
  message: "떡반집 위치 알려줘",
  linkTitle: "떡반집",
});
assert.match(place.summary, /떡반|지도/);
assert.ok(place.actions.length >= 1);
assert.match(place.actions[0]?.href ?? "", /map|naver|google/i);

const nav = orchestrateByRules({ message: "네비 실행해줘", linkTitle: "타임스퀘어" });
assert.ok(nav.actions.some((action) => /길찾|navigate|maps/i.test(action.href ?? "")));

const url = orchestrateByRules({
  message: "https://www.nytimes.com/article 확인해줘",
});
assert.ok(url.actions.some((action) => action.href?.includes("nytimes.com")));

const parsed = parseOrchestratorJson(
  JSON.stringify({
    summary: "맛집 지도",
    actions: [
      {
        label: "지도",
        icon: "map-pin",
        action_type: "WEB_VIEW",
        url: "https://map.naver.com/v5/search/떡반집",
      },
    ],
  })
);
assert.ok(parsed);
assert.equal(wireActionsToLinkItems(parsed!.actions).length, 1);

const greet = orchestrateConversation({ message: "ㅎㅇ" });
assert.ok(greet);
assert.equal(greet!.summary, "안녕하세요. 무엇을 도와드릴까요?");
assert.equal(greet!.actions.length, 0);

const tired = orchestrateConversation({ message: "너무 힘들어" });
assert.ok(tired);
assert.match(tired!.summary, /지치/);

const sadan = orchestrateConversation({
  message: "사단 관점에서 조언해줘. 친구랑 싸웠어",
});
assert.ok(sadan);
assert.match(sadan!.summary, /측은/);

const greetWithContext = orchestrateConversation({
  message: "안녕",
  linkTitle: "떡반집",
});
assert.ok(greetWithContext?.summary.includes("떡반집"));

const notGreet = orchestrateConversation({ message: "ㅎㅇ 떡반집 알려줘" });
assert.equal(notGreet, null);

const disclosed = applyDisclosureToOrchestratorResult({
  summary: "떡반집",
  actions: place.actions,
  source: "rules",
  confidence: 0.92,
});
assert.equal(disclosed.disclosure, "high");
assert.equal(disclosed.actionsRevealed, false);
assert.match(disclosed.summary, /맞죠/);

const medium = applyDisclosureToOrchestratorResult({
  summary: "떡반집",
  actions: place.actions,
  source: "rules",
  confidence: 0.72,
});
assert.equal(medium.disclosure, "medium");
assert.equal(medium.pendingConfirm, true);
assert.match(medium.summary, /켜드릴까요/);

const low = applyDisclosureToOrchestratorResult({
  summary: "떡반집",
  actions: place.actions,
  source: "rules",
  confidence: 0.5,
});
assert.equal(low.disclosure, "low");
assert.equal(low.actions.length, 0);

assert.ok(isUserConfirmingActions("응"));
assert.ok(isUserConfirmingActions("네 보여주세요"));
assert.equal(resolveDisclosureTier(0.91), "high");

console.log("test-action-chat-orchestrator: ok");
