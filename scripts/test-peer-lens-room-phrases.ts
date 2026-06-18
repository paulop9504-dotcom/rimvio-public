#!/usr/bin/env npx tsx
/**
 * ROOM 렌즈 테스트 문구 자동 검증 + 수동 복사 목록 출력
 *
 *   npx tsx scripts/test-peer-lens-room-phrases.ts          # assert all scenarios
 *   npx tsx scripts/test-peer-lens-room-phrases.ts --print  # 복사용 문구만 출력
 */
import assert from "node:assert/strict";
import type { PeerMessage } from "../lib/context/peer-message-types";
import { analyzePeerThreadForLens } from "../lib/peer-chat/ai-lens/rank-lens-bubbles";
import {
  lensCandidateLabels,
  PEER_LENS_QUICK_COPY,
  PEER_LENS_TEST_SCENARIOS,
} from "../lib/peer-chat/ai-lens/peer-lens-room-test-phrases";

const REF_WED = new Date(2026, 5, 3); // 2026-06-03 수요일 — "이번주 금요일" = 6/5

function toMessages(
  turns: { author: "peer" | "me"; body: string }[],
): PeerMessage[] {
  return turns.map((turn, index) => ({
    id: `msg-${index + 1}`,
    peerThreadId: "peer-dm-test",
    author: turn.author,
    body: turn.body,
    sentAt: new Date().toISOString(),
    messageType: "human" as const,
  }));
}

function printManualCatalog() {
  console.log("\n=== ROOM AI 렌즈 수동 테스트 문구 ===\n");
  console.log("※ 렌즈 ON 필수 · 버블은 일정이 잡힌 말풍선(내/친구) 바로 아래에 붙어요.\n");
  console.log("【 빠른 시작 】");
  console.log("  1. 렌즈 ON");
  console.log("  2. 친구에게 아래 문구 보내달라고 하거나, 테스트 계정으로 peer 메시지 입력");
  console.log("  3. 왼쪽 말풍선 아래 버블 확인 → 탭 → 확인 시트 → 저장\n");

  for (const [category, lines] of Object.entries(PEER_LENS_QUICK_COPY)) {
    console.log(`── ${category} ──`);
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    console.log("");
  }

  console.log("── 자동 검증 시나리오 (기대 버블) ──");
  for (const scenario of PEER_LENS_TEST_SCENARIOS) {
    const turns = scenario.turns ?? [{ author: "peer" as const, body: scenario.copyLine }];
    const analysis = analyzePeerThreadForLens(toMessages(turns), REF_WED);
    const got = analysis.candidates.length
      ? lensCandidateLabels(analysis.candidates)
      : ["없음"];
    console.log(`  [${scenario.who}] ${scenario.copyLine}`);
    console.log(`    → ${got.join(" + ")}${scenario.memo ? ` (${scenario.memo})` : ""}`);
  }
  console.log("");
}

if (process.argv.includes("--print")) {
  printManualCatalog();
  process.exit(0);
}

let passed = 0;
for (const scenario of PEER_LENS_TEST_SCENARIOS) {
  const turns = scenario.turns ?? [{ author: "peer" as const, body: scenario.copyLine }];
  const analysis = analyzePeerThreadForLens(toMessages(turns), REF_WED);
  const got = analysis.candidates.length
    ? lensCandidateLabels(analysis.candidates)
    : ["없음"];

  for (const expected of scenario.expect) {
    assert.ok(
      got.includes(expected),
      `${scenario.id}: expected "${expected}" in [${got.join(", ")}] — "${scenario.copyLine}"`,
    );
  }

  if (scenario.expect.includes("없음") && scenario.expect.length === 1) {
    assert.equal(analysis.candidates.length, 0, `${scenario.id}: should have no candidates`);
  }

  if (scenario.expect.some((e) => e !== "없음") && turns.some((t) => t.author === "peer")) {
    assert.ok(
      analysis.anchorMessageId,
      `${scenario.id}: peer anchor required for UI attachment`,
    );
  }

  if (scenario.id === "me-only-schedule") {
    assert.equal(
      analysis.anchorMessageId,
      "msg-1",
      "me-only: anchor on my message for bubble attachment",
    );
  }

  passed += 1;
}

assert.equal(
  analyzePeerThreadForLens(
    toMessages([{ author: "peer", body: "이번주 금요일 7시에 보자" }]),
    REF_WED,
  ).candidates.some((c) => c.actionType === "schedule"),
  true,
  "golden phrase must yield schedule",
);

console.log(`test-peer-lens-room-phrases: ok (${passed} scenarios)`);
