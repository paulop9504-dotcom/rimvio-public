#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { parseMentionTimerDuration } from "../lib/action-chat/mention-timer/inline-chat-timer";
import {
  isMentionFocusInput,
  tryBuildMentionFocusTurn,
} from "../lib/action-chat/mention-focus/commit-mention-focus-turn";
import { applyFocusConfirmToMessages } from "../lib/action-chat/mention-focus/apply-focus-message-update";
import {
  applyFocusSessionRouteOverride,
  isEmailNotification,
  isKakaoNotification,
} from "../lib/action-chat/mention-focus/focus-notification-gate";
import {
  buildFocusHeldPanelItem,
  shadowRecordToHeldItem,
} from "../lib/action-chat/mention-focus/build-focus-held-panel";
import {
  readFocusSession,
  resetFocusSessionForTests,
  startFocusSessionFromWire,
} from "../lib/action-chat/mention-focus/focus-session-store";
import { buildFocusConfirmWire, buildRunningFocusWire } from "../lib/action-chat/mention-focus/inline-chat-focus";
import { ingestNotification } from "../lib/notification-shadow/route-notification";
import { resetShadowStoreForTests } from "../lib/notification-shadow/shadow-store";
import { isFocusConfirmSpeech } from "../lib/action-chat/mention-focus/focus-confirm-speech";
import { tryDispatchLocalMentionTurn } from "../lib/action-chat/dispatch-local-mention-turn";

assert.equal(parseMentionTimerDuration("1시간"), 60 * 60 * 1000);

const turn = tryBuildMentionFocusTurn({ text: "@집중 1시간" });
assert.ok(turn);
assert.equal(turn![1]!.inlineChatFocus?.phase, "awaiting_confirm");

assert.equal(
  tryDispatchLocalMentionTurn({ text: "@집중 1시간" }),
  null,
  "slim protocol: focus @ not dispatched — NL orchestrator only",
);

const confirmed = applyFocusConfirmToMessages(turn!, turn![1]!.id);
assert.equal(confirmed[1]!.inlineChatFocus?.phase, "running");
assert.ok(readFocusSession()?.status === "running");

resetFocusSessionForTests();
resetShadowStoreForTests();

startFocusSessionFromWire({
  messageId: "msg-1",
  wire: buildRunningFocusWire(buildFocusConfirmWire(25 * 60 * 1000)),
});

const kakaoRecord = applyFocusSessionRouteOverride(
  ingestNotification({
    source: "external",
    source_app: "KakaoTalk",
    title: "친구",
    content: "뭐해?",
    timestamp: new Date().toISOString(),
  }),
);
assert.ok(isKakaoNotification(kakaoRecord));

const kakaoHeld = shadowRecordToHeldItem(kakaoRecord);
assert.equal(kakaoHeld.title, "친구");
assert.ok(kakaoHeld.mainActions.some((action) => action.kind === "confirm"));
assert.ok(kakaoHeld.mainActions.some((action) => action.kind === "reply_draft"));
assert.equal(kakaoHeld.auxAction?.kind, "open_external");
assert.equal(kakaoHeld.auxAction?.tier, "AUX");
assert.equal(kakaoHeld.auxAction?.target, "kakaotalk://");

const emailRecord = applyFocusSessionRouteOverride(
  ingestNotification({
    source: "external",
    source_app: "Gmail",
    title: "회의 초대",
    content: "내일 10시",
    timestamp: new Date().toISOString(),
  }),
);
assert.ok(isEmailNotification(emailRecord));

const emailHeld = buildFocusHeldPanelItem(emailRecord);
assert.ok(emailHeld.mainActions.some((action) => action.label === "답장 초안"));

const urlRecord = applyFocusSessionRouteOverride(
  ingestNotification({
    source: "external",
    source_app: "Slack",
    title: "멘션",
    content: "확인 https://slack.com/app_redirect?channel=C123",
    timestamp: new Date().toISOString(),
  }),
);
const urlHeld = buildFocusHeldPanelItem(urlRecord);
assert.ok(urlHeld.mainActions.some((action) => action.kind === "open_embedded"));
assert.ok(urlHeld.mainActions.some((action) => action.kind === "open_embedded" && action.target?.startsWith("https://")));

assert.ok(isFocusConfirmSpeech("확인"));

resetFocusSessionForTests();

console.log("test-mention-focus: ok");
