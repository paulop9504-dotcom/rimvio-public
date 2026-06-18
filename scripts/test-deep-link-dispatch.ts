#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { processActionAgentBatch } from "../lib/action-chat/action-agent-batch";
import { orchestrateByRules } from "../lib/action-chat/rule-orchestrator";
import { deepLinkActionToLinkItem } from "../lib/deep-link-dispatch/dispatch-to-link-action";
import { parseDeepLinkDispatcherJson } from "../lib/deep-link-dispatch/parse-dispatcher-json";
import {
  orchestrateDeepLinkDispatch,
  tryDeepLinkDispatchOrchestration,
} from "../lib/deep-link-dispatch/orchestrate-deep-link-dispatch";
import { resolveDeepLinkDispatch } from "../lib/deep-link-dispatch/resolve-dispatch";

const tossReady = resolveDeepLinkDispatch("토스로 5만원 송금해줘");
assert.ok(tossReady);
assert.equal(tossReady!.action.status, "READY_TO_EXECUTE");
assert.equal(tossReady!.action.intent, "FINANCE");
assert.match(tossReady!.action.deep_link, /supertoss:\/\/transfer\?amount=50000/);

const tossMissing = resolveDeepLinkDispatch("토스로 송금해줘");
assert.ok(tossMissing);
assert.equal(tossMissing!.action.status, "MISSING_PARAMETER");
assert.ok(tossMissing!.action.missing_parameter?.includes("amount"));

const taxi = resolveDeepLinkDispatch("지금 택시 불러줘");
assert.ok(taxi);
assert.equal(taxi!.action.status, "READY_TO_EXECUTE");
assert.equal(taxi!.action.deep_link, "kakaot://open");

const nav = resolveDeepLinkDispatch("강남역까지 길 찾아줘");
assert.ok(nav);
assert.equal(nav!.action.status, "READY_TO_EXECUTE");
assert.match(nav!.action.deep_link, /kakaomap:\/\/search/);

const llmJson = parseDeepLinkDispatcherJson(`
\`\`\`json
{
  "thought": "토스 송금",
  "action": {
    "intent": "FINANCE",
    "target_app": "Toss",
    "deep_link": "supertoss://transfer?amount=50000",
    "status": "READY_TO_EXECUTE"
  },
  "message": "토스 송금 화면을 띄울까요?"
}
\`\`\`
`);
assert.ok(llmJson);
assert.equal(llmJson!.action.deep_link, "supertoss://transfer?amount=50000");

const linkItem = deepLinkActionToLinkItem(llmJson!.action, "toss-transfer");
assert.ok(linkItem);
assert.equal(linkItem!.payload?.deepLinkDispatch, true);

const orchestrated = orchestrateDeepLinkDispatch({ message: "카톡 열어줘" });
assert.ok(orchestrated);
assert.equal(orchestrated!.actions[0]?.href, "kakaotalk://talk/friends");

const rules = orchestrateByRules({ message: "쿠팡 배송 어디야" });
assert.ok(rules.actions[0]?.href?.includes("coupang://order/tracking"));

const pasted = tryDeepLinkDispatchOrchestration({
  message: "이거 실행해 supertoss://transfer?amount=10000",
});
assert.ok(pasted);
assert.match(pasted!.actions[0]?.href ?? "", /supertoss:\/\/transfer/);

const batch = processActionAgentBatch("토스로 3만원 보내고 택시 불러줘", {
  referenceDate: "2026-05-29",
});
assert.ok(batch);
assert.equal(batch!.results.length, 2);
assert.equal(batch!.results[0]?.type, "DEEP_LINK");
assert.match(batch!.results[0]?.actions[0]?.url ?? "", /supertoss/);

console.log("test-deep-link-dispatch: ok");
