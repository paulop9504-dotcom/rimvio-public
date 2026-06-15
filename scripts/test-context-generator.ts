#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  generateChainedSystemPrompt,
  generateChainContext,
} from "../lib/containers/context-generator";
import { normalizeActiveChains } from "../lib/containers/container-types";

const context = generateChainContext(["bitcoin_trader", "news_briefing"]);
assert.ok(context);
assert.deepEqual(context!.activeChains, ["bitcoin_trader", "news_briefing"]);
assert.match(context!.activeChainsPersona, /비트코인/);
assert.match(context!.activeChainsPersona, /뉴스/);
assert.ok(context!.capabilityList.includes("BUY"));
assert.ok(context!.capabilityList.includes("FETCH_NEWS"));

const prompt = generateChainedSystemPrompt({
  basePrompt: "# BASE",
  activeChains: ["bitcoin_trader", "news_briefing"],
});
assert.match(prompt, /# BASE/);
assert.match(prompt, /ACTIVE_CHAINS_PERSONA/);
assert.match(prompt, /CAPABILITY_LIST/);
assert.match(prompt, /activeChains = \["bitcoin_trader","news_briefing"\]/);

assert.deepEqual(
  normalizeActiveChains(["crypto_trader_01", "news_reader_01"]),
  ["bitcoin_trader", "news_briefing"]
);

console.log("test-context-generator: ok");
