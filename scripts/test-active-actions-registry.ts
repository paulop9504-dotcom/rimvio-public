#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { collectActiveActions, collectActionStream, countActiveActions } from "../lib/action-chat/active-actions-registry";
import { resetLinkRemindersForTests, scheduleLinkReminderAt } from "../lib/local-links/reminders";
import type { ActionChatMessage } from "../lib/action-chat/orchestrator-types";

function assistant(partial: Partial<ActionChatMessage>): ActionChatMessage {
  return {
    id: partial.id ?? crypto.randomUUID(),
    role: "assistant",
    text: partial.text ?? "",
    createdAt: partial.createdAt ?? new Date().toISOString(),
    ...partial,
  };
}

const scheduled = assistant({
  id: "scheduled-1",
  text: "3분 뒤 수서역 일정을 캘린더에 넣어뒀어요.",
  scheduledDelivery: { fire_at: "2026-05-29T15:03:00", status: "pending" },
  scheduleExtract: {
    address: null,
    phone: null,
    datetime: "2026-05-29T15:03:00",
    place_name: "수서역",
    url: null,
  },
});

const confirm = assistant({
  id: "confirm-1",
  text: "갤러리아 확인",
  pendingConfirm: true,
  confirmation: {
    meta: { intent: "CONFIRM" },
    persona_message: "갤러리아군요!",
    confirm_message: "확인할까요?",
    extracted_data: {
      address: null,
      phone: null,
      datetime: null,
      place_name: "갤러리아",
      url: null,
    },
  },
});

const revealed = assistant({
  id: "revealed-1",
  text: "네비게이션 준비됐어요",
  actionsRevealed: true,
  actions: [{ label: "네비게이션", href: "tmap://", payload: {} }],
});

const actions = collectActiveActions([scheduled, confirm, revealed]);
assert.equal(actions.length, 3);
assert.equal(countActiveActions([scheduled, confirm, revealed]), 3);
assert.equal(actions[0]?.kind, "scheduled_nav");
assert.match(actions[0]?.title ?? "", /수서역/);
assert.equal(actions[0]?.linkId, null);

resetLinkRemindersForTests();
scheduleLinkReminderAt({
  linkId: "link-1",
  title: "테스트 링크",
  url: "https://example.com",
  fireAt: "2026-05-30T15:00:00",
});

const withLink = collectActionStream([], { linkIds: ["link-1"] });
assert.ok(withLink.some((entry) => entry.kind === "link_reminder"));

console.log("test-active-actions-registry: ok");
