#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { orchestrateUserDefinedAction } from "../lib/action-chat/orchestrate-user-defined-action";
import { orchestrateByRules } from "../lib/action-chat/rule-orchestrator";
import {
  extractActionParams,
  matchUserDefinedAction,
  parseKoreanMoneyToNumber,
  resolveUserDefinedActionUrl,
} from "../lib/actions/match-user-defined-action";
import type { UserDefinedAction } from "../lib/actions/user-defined-action-types";

const btcShort: UserDefinedAction = {
  id: "test-btc",
  name: "비트코인 숏 매수",
  triggers: ["숏 매수해", "숏 걸어", "비트코인 숏"],
  urlTemplate:
    "exchange-app://trade?pair=BTC-USDT&side=short&action=open&amount={amount}",
  params: [{ key: "amount", label: "금액" }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

assert.equal(parseKoreanMoneyToNumber("100만원"), 1_000_000);
assert.equal(parseKoreanMoneyToNumber("50만"), 500_000);

const params = extractActionParams("비트코인 숏 100만원 매수해", btcShort);
assert.equal(params.amount, "1000000");

const resolved = resolveUserDefinedActionUrl(btcShort.urlTemplate, params);
assert.equal(
  resolved,
  "exchange-app://trade?pair=BTC-USDT&side=short&action=open&amount=1000000"
);

const match = matchUserDefinedAction("숏 매수해 100만원", [btcShort]);
assert.ok(match);
assert.equal(match!.resolvedUrl, resolved);

const orchestrated = orchestrateUserDefinedAction({
  message: "비트코인 숏 100만원 매수해",
  userDefinedActions: [btcShort],
});
assert.ok(orchestrated);
assert.match(orchestrated!.summary, /1,000,000원/);
assert.equal(
  orchestrated!.actions[0]?.href,
  "exchange-app://trade?pair=BTC-USDT&side=short&action=open&amount=1000000"
);

const rules = orchestrateByRules({
  message: "숏 걸어",
  userDefinedActions: [btcShort],
});
assert.ok(rules.actions[0]?.href?.includes("exchange-app://"));

console.log("test-user-defined-action: ok");
