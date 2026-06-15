#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { parseSpendReceiptPreview } from "../lib/action-chat/parse-spend-receipt";

const spend = parseSpendReceiptPreview({
  signal: "🧾 영수증 · 12,500원 — 지출 기록",
  title: "스타벅스 강남점",
});
assert.ok(spend);
assert.equal(spend!.amountWon, 12500);
assert.match(spend!.merchant, /스타벅스/);

const none = parseSpendReceiptPreview({ signal: "📍 떡반집", title: "떡반집" });
assert.equal(none, null);

console.log("test-parse-spend-receipt: ok");
