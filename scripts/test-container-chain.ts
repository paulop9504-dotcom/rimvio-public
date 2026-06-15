#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  resetActiveChainsForTests,
  snapActiveChains,
  writeActiveChains,
} from "../lib/containers/active-chains-state";
import { mergeActiveChainsPersona, unionCapabilities } from "../lib/containers/container-types";
import { generateChainedSystemPrompt } from "../lib/containers/context-generator";

writeActiveChains([]);
const chain = snapActiveChains("bitcoin_trader", "news_briefing");
assert.deepEqual(chain, ["bitcoin_trader", "news_briefing"]);

assert.match(
  mergeActiveChainsPersona(["bitcoin_trader", "news_briefing"]),
  /비트코인/
);
const union = unionCapabilities(["bitcoin_trader", "news_briefing"]);
assert.ok(union.includes("BUY"));
assert.ok(union.includes("FETCH_NEWS"));

const prompt = generateChainedSystemPrompt({
  basePrompt: "BASE",
  activeChains: chain,
});
assert.match(prompt, /CAPABILITY_LIST/);

resetActiveChainsForTests([]);

console.log("test-container-chain: ok");
