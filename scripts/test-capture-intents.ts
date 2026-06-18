#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildCaptureActions, captureRemoteSignalLine } from "../lib/capture/build-capture-actions";
import { resolveInferredCaptureIntent } from "../lib/capture/resolve-inferred-query";
import { detectCaptureIntent } from "../lib/capture/detect-capture-intent";
import { resolveContextRemote } from "../lib/remote/resolve-context-remote";

const samples: Array<{ label: string; text: string; kind: string }> = [
  {
    label: "payment",
    text: "국민은행 123-456-789012 홍길동",
    kind: "payment_send",
  },
  {
    label: "menu",
    text: "카페 브런치\n아메리카노 4,500원\n라떼 5,000원\n메뉴",
    kind: "menu_food",
  },
  {
    label: "product",
    text: "Galaxy S24 Ultra 256GB\n1,350,000원\n무료배송",
    kind: "product",
  },
  {
    label: "address",
    text: "서울특별시 강남구 테헤란로 152",
    kind: "address",
  },
  {
    label: "business card",
    text: "홍길동 Team Lead\n010-1234-5678\nhong@company.co.kr\n(주)림비오",
    kind: "business_card",
  },
  {
    label: "receipt",
    text: "스타벅스 강남점\n합계 5,500원\n승인 1234\n영수증",
    kind: "receipt",
  },
  {
    label: "travel booking",
    text: "Booking.com confirmation\nHotel Jeju Ocean View\nCheck-in 2026-06-01",
    kind: "travel_booking",
  },
  {
    label: "ticket",
    text: "Melon Ticket\nBTS Concert\n2026.07.15\nSeoul Olympic Hall",
    kind: "ticket",
  },
  {
    label: "document study",
    text: [
      "Physics of the Soul",
      "46",
      "The Changing View of God",
      "The Tibetan Book of the Dead introduced many Western readers to the idea that consciousness might survive bodily death.",
      "Later chapters connect this view to quantum theories of the self and the observer effect in modern physics.",
      "Students often confuse this with simple reincarnation myths — focus on the philosophical shift in how God is understood.",
    ].join("\n"),
    kind: "document_study",
  },
  {
    label: "foreign sign",
    text: "Exit to Shibuya Station\nNo smoking\nRestaurant open 11:00",
    kind: "foreign_sign",
  },
  {
    label: "parking",
    text: "Parking Ticket\nZone B3\nExit until 18:30",
    kind: "parking",
  },
  {
    label: "wifi",
    text: "WiFi Network\nSSID: CafeGuest\nPassword: hello2026",
    kind: "wifi_qr",
  },
  {
    label: "medicine",
    text: "Tylenol 500mg\n복용법: 1정 8시간마다\n주의사항",
    kind: "medicine",
  },
];

for (const sample of samples) {
  const intent = detectCaptureIntent({ text: sample.text });
  assert.ok(intent, `${sample.label} should detect intent`);
  assert.equal(intent!.kind, sample.kind, `${sample.label} kind`);
  const inferred = resolveInferredCaptureIntent({ intent: intent! });
  assert.ok(buildCaptureActions(inferred).length >= 2, `${sample.label} actions`);
  assert.ok(captureRemoteSignalLine(inferred).length > 4, `${sample.label} signal`);
}

const menuRemote = resolveContextRemote({
  captureIntent: detectCaptureIntent({
    text: "맛집 홍대 파스타\n세트 12,000원",
  })!,
  link: null,
});

assert.equal(menuRemote.packId, "menu_food");
assert.ok(menuRemote.expanded);

const burstRemote = resolveContextRemote({
  link: {
    id: "x",
    user_id: null,
    original_url: "https://rimvio.app/capture/x",
    title: "연속 촬영",
    thumbnail_url: null,
    domain: "rimvio.app",
    category: "shopping",
    actions: [],
    visual_mode: "thumb",
    source_type: "screenshot",
    share_slug: null,
    link_status: "open",
    room_id: null,
    created_at: new Date().toISOString(),
    expires_at: null,
  },
  now: Date.now(),
});

assert.ok(burstRemote);

console.log(`✓ capture intents: ${samples.length} kinds + remote wiring`);
