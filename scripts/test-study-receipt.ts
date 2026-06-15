#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildStudyReceipt,
  buildStudyReceiptFromLink,
  formatStudyReceiptPlainText,
  shouldShowStudyReceipt,
} from "../lib/study/build-study-receipt";
import {
  EXAM_POSTIT_LABELS,
  buildExamPostItPrompt,
} from "../lib/study/exam-postit-template";
import { resolveFeedCardInsight } from "../lib/feed/resolve-feed-card-panel";
import { resolveReceiptPeekKind } from "../lib/feed/resolve-receipt-peek";

const physicsOcr = [
  "Physics of the Soul",
  "47",
  "The Changing View of God",
  "We call this the quantum self, the subject that has complete freedom of choice in the process of quantum measurement.",
  "God is not a king on a throne but the Creative Principle within science and consciousness.",
  "Mitchell and Goswami (1992) showed how memory afterimages shape what we perceive as reality.",
  "Libet et al. (1979) found a half-second delay between stimulus and conscious report.",
  "We are God and yet we are not God — a paradox of being creator and partial self.",
].join("\n");

const receipt = buildStudyReceipt({
  title: "Physics of the Soul",
  ocrText: physicsOcr,
});

assert.equal(receipt.available, true);
assert.match(receipt.headline, /Physics of the Soul/);
assert.equal(receipt.pageLabel, "p.47");

const contextLine = receipt.lines.find((line) => line.label === EXAM_POSTIT_LABELS.context);
assert.ok(contextLine, "context line");
assert.match(contextLine!.value, /양자|창조|의식/);

const memorizeLines = receipt.lines.filter((line) => line.label === EXAM_POSTIT_LABELS.memorize);
assert.ok(memorizeLines.length >= 1, "memorize lines");
assert.ok(
  memorizeLines.some((line) => /Quantum Self|Creative Principle/i.test(line.value)),
  "memorize terms"
);

const keywordLines = receipt.lines.filter((line) => line.label === EXAM_POSTIT_LABELS.keyword);
assert.ok(keywordLines.length >= 1, "keyword lines");

const examLine = receipt.lines.find((line) => line.label === EXAM_POSTIT_LABELS.exam);
assert.ok(examLine, "exam line");
assert.match(examLine!.value, /심판자|창조 원리|양자/);

assert.match(formatStudyReceiptPlainText(receipt), /시험 포스트잇/);
assert.match(formatStudyReceiptPlainText(receipt), /📍 맥락:/);

const prompt = buildExamPostItPrompt("Physics of the Soul", physicsOcr);
assert.match(decodeURIComponent(prompt), /포스트잇 요약/);
assert.match(decodeURIComponent(prompt), /📍 맥락:/);
assert.match(decodeURIComponent(prompt), /◆ 외울 것:/);
assert.match(decodeURIComponent(prompt), /\? 출제 각:/);

const link = {
  id: "study-1",
  user_id: null,
  original_url: "https://rimvio.app/capture/study-1",
  title: "Physics of the Soul",
  thumbnail_url: "https://example.com/book.jpg",
  domain: "rimvio.app",
  category: "research",
  actions: [
    {
      id: "study-primary",
      label: "📝 시험용 30초 정리",
      kind: "open" as const,
      href: "#ai",
      payload: { copyText: physicsOcr },
    },
    {
      id: "study-copy",
      label: "📋 포스트잇 복사",
      kind: "open" as const,
      href: "#copy-text",
      payload: { copyText: formatStudyReceiptPlainText(receipt) },
    },
  ],
  visual_mode: "thumb" as const,
  source_type: "screenshot" as const,
  share_slug: null,
  link_status: "open" as const,
  room_id: null,
  created_at: new Date().toISOString(),
  expires_at: null,
};

assert.equal(shouldShowStudyReceipt(link), true);
assert.equal(resolveFeedCardInsight(link), "study");

const fromLink = buildStudyReceiptFromLink(link);
assert.equal(fromLink.available, true);
assert.match(fromLink.headline, /p\.47/);

assert.equal(
  resolveReceiptPeekKind({
    link,
    signalLine: "📖 Physics of the Soul · p.47",
    hasAmbientInsight: false,
    timeAvailable: true,
    marketAvailable: false,
    trueCostAvailable: false,
    studyAvailable: true,
  }),
  "study"
);

console.log("test-study-receipt: ok");
