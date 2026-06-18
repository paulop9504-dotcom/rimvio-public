#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildTikiTakaOfflineReply } from "../lib/action-chat/tiki-taka-dialogue-prompt";
import { orchestrateAiIntent } from "../lib/action-chat/orchestrate-ai-intent";

const meal = buildTikiTakaOfflineReply("오늘 뭐 먹지?", "DECISION");
assert.match(meal, /A\)/);
assert.match(meal, /👉/);
assert.match(meal, /빠르게|맛 기준|가볍게/);

const purchase = orchestrateAiIntent("이거 사도 돼?");
assert.ok(purchase);
assert.match(purchase!.summary ?? "", /A\)/);
assert.match(purchase!.summary ?? "", /기준/);

const clothes = orchestrateAiIntent("옷사야함");
assert.ok(clothes);
assert.match(clothes!.summary ?? "", /뭘 살지|당장|가성비/);

console.log("test-tiki-taka-dialogue: ok");
