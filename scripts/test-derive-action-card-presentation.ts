#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { deriveActionCardPresentation } from "../lib/action-chat/derive-action-card-presentation";
import type { ActiveActionEntry } from "../lib/action-chat/active-actions-registry";

function entry(partial: Partial<ActiveActionEntry>): ActiveActionEntry {
  return {
    id: "e1",
    messageId: "m1",
    linkId: null,
    reminderId: null,
    kind: "scheduled_nav",
    title: "둔산동 헤어숍 길찾기",
    subtitle: "에 둔산동에 헤어숍 갈거야",
    fireAt: "2026-05-29T14:00:00",
    placeName: "둔산동 헤어숍",
    actionCount: 2,
    countdownLabel: null,
    ...partial,
  };
}

const card = deriveActionCardPresentation(entry({}));
assert.equal(card.title, "둔산동 헤어숍 방문");
assert.match(card.timeLine, /예약/);
assert.equal(card.statusLabel, "예약됨");
assert.ok(card.clockLabel);

const confirm = deriveActionCardPresentation(
  entry({
    kind: "pending_confirm",
    placeName: "갤러리아",
    fireAt: null,
  })
);
assert.equal(confirm.title, "갤러리아 확인");
assert.equal(confirm.statusTone, "confirm");

console.log("test-derive-action-card-presentation: ok");
