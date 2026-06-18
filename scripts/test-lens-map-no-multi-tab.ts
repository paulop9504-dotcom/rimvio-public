#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { executeDeepLinkBubbleCandidate } from "../lib/peer-chat/ai-lens/execute-lens-bubble";

const executeSrc = readFileSync(
  join(process.cwd(), "lib/peer-chat/ai-lens/execute-lens-bubble.ts"),
  "utf8",
);

const navigateBlock = executeSrc.slice(
  executeSrc.indexOf('case "navigate":'),
  executeSrc.indexOf('case "transfer":'),
);
assert.ok(
  navigateBlock.includes("openMapProvider"),
  "navigate must open preferred map provider directly",
);
assert.equal(
  navigateBlock.includes("openMapPicker"),
  false,
  "navigate case must not defer to map picker sheet",
);

const navResult = executeDeepLinkBubbleCandidate({
  id: "nav-1",
  actionType: "navigate",
  label: "둔산동 멕시카나",
  deepLink: "",
  score: 1,
  confidence: 1,
  reason: "test",
  payload: { place: "둔산동 멕시카나" },
});
assert.equal(navResult.ok, true);
assert.equal(navResult.openMapPicker, undefined);

console.log("test-lens-map-no-multi-tab: ok");
