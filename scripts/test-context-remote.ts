#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { detectPaymentFromText } from "../lib/remote/detect-input-intent";
import { resolveContextRemote } from "../lib/remote/resolve-context-remote";
import type { LinkRow } from "../types/database";

const baseLink = (overrides: Partial<LinkRow>): LinkRow => ({
  id: "test",
  user_id: null,
  original_url: "https://rimvio.app/capture/x",
  title: "테스트",
  thumbnail_url: null,
  domain: "rimvio.app",
  category: "uncategorized",
  actions: [],
  visual_mode: "thumb",
  source_type: "screenshot",
  share_slug: null,
  link_status: "open",
  room_id: null,
  created_at: new Date().toISOString(),
  expires_at: null,
  ...overrides,
});

assert.ok(
  detectPaymentFromText("국민은행 123-456-789012 홍길동"),
  "detects bank account paste"
);

const paymentRemote = resolveContextRemote({
  clipboardText: "우리은행 1002-123-456789",
  link: null,
});

assert.equal(paymentRemote.packId, "payment_send");
assert.equal(paymentRemote.visible, true);
assert.ok(paymentRemote.expanded);
assert.match(paymentRemote.primary?.label ?? "", /토스/);

const capturePaymentRemote = resolveContextRemote({
  captureIntent: {
    kind: "payment_send",
    query: "1002-123-456789",
    ocrText: "우리은행 1002-123-456789",
    accountDisplay: "1002-123-456789",
    bankHint: "우리",
  },
  link: baseLink({ title: "제주 성산일출봉", category: "travel" }),
});

assert.equal(capturePaymentRemote.packId, "payment_send");
assert.match(capturePaymentRemote.signalLine, /사진에서/);
assert.ok(capturePaymentRemote.expanded);

assert.ok(
  !paymentRemote.secondary.some((action) => /amazon/i.test(action.href ?? ""))
);

const santorini = resolveContextRemote({
  link: baseLink({
    title: "산토리니 오ía 일몰",
    category: "travel",
  }),
});

assert.equal(santorini.packId, "mobility");
assert.match(santorini.primary?.label ?? "", /카카오T|지도/);
assert.ok(
  !santorini.secondary.some((action) => /amazon/i.test(action.href ?? ""))
);

const iphone = resolveContextRemote({
  link: baseLink({
    title: "아이폰 15 Pro 256GB",
    category: "shopping",
    source_type: "commerce",
    domain: "web.joongna.com",
    original_url: "https://web.joongna.com/product/1",
  }),
});

assert.equal(iphone.packId, "commerce_compare");
assert.ok(iphone.visible);
assert.ok(iphone.primary);

console.log("✓ context remote: payment clipboard + travel/commerce packs");
