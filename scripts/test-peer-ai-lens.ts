#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import type { PeerMessage } from "../lib/context/peer-message-types";
import { analyzePeerThreadForLens } from "../lib/peer-chat/ai-lens/rank-lens-bubbles";
import { parseLensDateFromText } from "../lib/peer-chat/ai-lens/parse-lens-date";
import { parseLensTimeFromText } from "../lib/peer-chat/ai-lens/parse-lens-time";
import { resetLensUserHistoryForTests } from "../lib/peer-chat/ai-lens/lens-user-history";
import { executeDeepLinkBubbleCandidate } from "../lib/peer-chat/ai-lens/execute-lens-bubble";
import type { DeepLinkBubbleCandidate } from "../lib/peer-chat/ai-lens/types";

function msg(
  id: string,
  author: PeerMessage["author"],
  body: string,
): PeerMessage {
  return {
    id,
    peerThreadId: "peer-dm-a__b",
    author,
    body,
    sentAt: new Date().toISOString(),
    messageType: "human",
  };
}

resetLensUserHistoryForTests([
  { actionType: "navigate", shown: 20, clicked: 18 },
  { actionType: "transfer", shown: 10, clicked: 7 },
  { actionType: "schedule", shown: 10, clicked: 1 },
]);

assert.equal(parseLensTimeFromText("7시에 치킨집에서 보자"), "19:00");
assert.equal(parseLensTimeFromText("오후 7시 CGV"), "19:00");
assert.equal(parseLensTimeFromText("7시 출근"), "07:00");
assert.equal(parseLensTimeFromText("아침 7시 커피"), "07:00");

const ex1 = analyzePeerThreadForLens([
  msg("1", "peer", "7시에 치킨집에서 보자"),
]);
assert.ok(ex1.candidates.some((c) => c.label.includes("일정")));
const ex1Schedule = ex1.candidates.find(
  (c) => c.actionType === "schedule" || c.actionType === "movie_schedule",
);
if (ex1Schedule?.payload?.datetime) {
  assert.equal(new Date(ex1Schedule.payload.datetime).getHours(), 19);
}
assert.equal(ex1.candidates.length <= 3, true);

const ex2 = analyzePeerThreadForLens([
  msg("1", "me", "어디 치킨집?"),
  msg("2", "peer", "둔산동 멕시카나"),
]);
assert.ok(ex2.candidates.some((c) => c.actionType === "navigate"));
assert.equal(ex2.anchorMessageId, "2");

const refWed = new Date(2026, 5, 3);
assert.equal(parseLensDateFromText("이번주 금요일", refWed)?.dateKey, "2026-06-05");
assert.equal(parseLensDateFromText("내일", refWed)?.dateKey, "2026-06-04");
assert.equal(parseLensDateFromText("6월 10일", refWed)?.dateKey, "2026-06-10");

const ex3 = analyzePeerThreadForLens(
  [msg("1", "peer", "이번주 금요일 CGV 갈래?")],
  refWed,
);
const movie = ex3.candidates.find((c) => c.actionType === "movie_schedule");
assert.ok(movie);
assert.ok(
  movie!.payload?.datetime?.startsWith("2026-06-05"),
  "movie schedule should use parsed Friday",
);

const ex4 = analyzePeerThreadForLens([
  msg("1", "peer", "내 계좌로 보내줘"),
]);
assert.ok(ex4.candidates.some((c) => c.actionType === "transfer"));

const ex5 = analyzePeerThreadForLens([
  msg("1", "peer", "이 문서 확인해줘 https://example.com/doc"),
]);
assert.ok(ex5.candidates.some((c) => c.actionType === "open_link"));

const ranked = analyzePeerThreadForLens([
  msg("1", "peer", "둔산동 멕시카나"),
  msg("2", "me", "ㅇㅋ"),
]);
const nav = ranked.candidates.find((c) => c.actionType === "navigate");
assert.ok(nav);
assert.ok(
  ranked.candidates[0]!.actionType === "navigate" ||
    nav.score >= ranked.candidates[ranked.candidates.length - 1]!.score,
  "navigate should rank high with history",
);

/** Week 3 golden: 이번주 금요일 7시 CGV */
const goldenCgv = analyzePeerThreadForLens(
  [msg("1", "peer", "이번주 금요일 7시에 CGV 보자")],
  refWed,
);
const goldenMovie = goldenCgv.candidates.find(
  (c) => c.actionType === "movie_schedule" || c.actionType === "schedule",
);
assert.ok(goldenMovie, "CGV Friday 7pm should yield schedule candidate");
const goldenDt = goldenMovie!.payload?.datetime ?? "";
assert.ok(goldenDt.length > 0, "schedule datetime required");
assert.equal(
  parseLensDateFromText("이번주 금요일", refWed)?.dateKey,
  "2026-06-05",
);
const goldenWhen = new Date(goldenDt);
assert.equal(goldenWhen.getDate(), 5, "Friday June 5 (local)");
assert.equal(goldenWhen.getHours(), 19, "7시 + CGV 약속 → 19:00 local");

/** Week 3 golden: 둔산동 멕시카나 → direct map open on execute */
const goldenNavAnalysis = analyzePeerThreadForLens([
  msg("1", "peer", "둔산동 멕시카나 갈래?"),
]);
const goldenNavCand = goldenNavAnalysis.candidates.find(
  (c) => c.actionType === "navigate",
);
assert.ok(goldenNavCand);
const navExecute = executeDeepLinkBubbleCandidate(
  goldenNavCand as DeepLinkBubbleCandidate,
);
assert.equal(navExecute.ok, true);
assert.ok(navExecute.message.includes("길찾기"));
assert.equal(navExecute.openMapPicker, undefined);

/** Week 3 golden: 송금 — no auto transfer */
const goldenTransfer = analyzePeerThreadForLens([
  msg("1", "peer", "3만원 송금해줘"),
]);
assert.ok(goldenTransfer.candidates.some((c) => c.actionType === "transfer"));
const transferExecute = executeDeepLinkBubbleCandidate(
  goldenTransfer.candidates.find((c) => c.actionType === "transfer")!,
);
assert.equal(transferExecute.ok, true);
assert.ok(transferExecute.message.includes("자동 송금 안 함"));

/** Multi-schedule thread — each turn keeps its own title/place (no 계산동 bleed). */
const refSat = new Date(2026, 5, 6, 12, 0, 0, 0);
const multiSchedule = analyzePeerThreadForLens(
  [
    msg("gyesan", "me", "계산동722"),
    msg("dunsan", "me", "내일 2시 둔산동 스타벅스에서 만나"),
    msg("jeju", "me", "6월7일 제주도 여행"),
    msg("daejeon", "me", "내일모레는 3시에 대전 시청에서 봐"),
  ],
  refSat,
);
const dunsanSchedule = multiSchedule.candidatesByMessageId.dunsan?.find(
  (c) => c.actionType === "schedule",
);
assert.ok(dunsanSchedule, "둔산 약속 메시지에 일정 렌즈 필요");
assert.ok(
  (dunsanSchedule!.payload?.title ?? "").includes("둔산"),
  "둔산 일정 제목이 계산동에 묶이면 안 됨",
);
assert.ok(
  !(dunsanSchedule!.payload?.title ?? "").includes("계산동"),
  "계산동 제목 bleed 금지",
);
const jejuSchedule = multiSchedule.candidatesByMessageId.jeju?.find(
  (c) => c.actionType === "schedule",
);
assert.ok(jejuSchedule, "제주 여행 메시지에 일정 렌즈 필요");
assert.ok((jejuSchedule!.payload?.title ?? "").includes("제주"));

console.log("test-peer-ai-lens: ok");
