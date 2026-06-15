#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveReceiptPeekKind } from "../lib/feed/resolve-receipt-peek";

const link = {
  original_url: "https://www.musinsa.com/app/goods/123",
  title: "무신사 상품",
  thumbnail_url: null,
  domain: "musinsa.com",
  category: "shopping",
};

assert.equal(
  resolveReceiptPeekKind({
    link,
    signalLine: "🌙 늦은 시간 쇼핑 — True Cost로 한 번 더",
    hasAmbientInsight: false,
    timeAvailable: false,
    marketAvailable: false,
    trueCostAvailable: false,
  }),
  "save"
);

assert.equal(
  resolveReceiptPeekKind({
    link,
    signalLine: "🌙 늦은 시간 쇼핑 — True Cost로 한 번 더",
    hasAmbientInsight: true,
    timeAvailable: false,
    marketAvailable: false,
    trueCostAvailable: false,
  }),
  null
);

assert.equal(
  resolveReceiptPeekKind({
    link,
    signalLine: "시세 비교",
    hasAmbientInsight: false,
    timeAvailable: false,
    marketAvailable: true,
    trueCostAvailable: false,
  }),
  "market"
);

assert.equal(
  resolveReceiptPeekKind({
    link,
    signalLine: "📝 시험용 30초 정리",
    hasAmbientInsight: false,
    timeAvailable: false,
    marketAvailable: false,
    trueCostAvailable: false,
    studyAvailable: true,
  }),
  "study"
);

console.log("test-receipt-peek: ok");
