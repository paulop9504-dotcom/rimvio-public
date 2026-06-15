#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { extractEventsFromOcr } from "../lib/events/extract-events-from-ocr";
import { parseOcrTextFromComposerContext } from "../lib/events/parse-ocr-from-composer-context";
import { orchestrateOcrScheduleCandidates } from "../lib/events/orchestrate-ocr-schedule-candidates";
import { orchestrateUserMessage } from "../lib/action-chat/orchestrate-user-message";

const REF = "2026-06-01";

const ocrBlock = `[첨부1·사진] OCR.png
[첨부1·OCR본문]
7시 기상
9~11 보험 상담
11:30 점심
14시 병원
16시 고객 미팅
저녁에 운동
[첨부1·Vision] schedule`;

const legacyInline = `[첨부1·사진] OCR.png · OCR: 7시 기상 9~11 보험 상담 11:30 점심 14시 병원 · Vision: x`;

const parsed = parseOcrTextFromComposerContext(legacyInline);
assert.ok(parsed?.includes("보험 상담"));
assert.ok(extractEventsFromOcr(parsed!, { referenceDate: REF }).events.length >= 4);

const direct = orchestrateOcrScheduleCandidates({
  composerContext: ocrBlock,
  referenceDate: REF,
});
assert.ok(direct?.summary.includes("일정 후보"));
assert.ok(!direct!.summary.includes("무엇을 도와드릴까요"));
assert.match(direct!.summary, /보험|병원|미팅/);
const eventCount =
  (direct!.metadata as { ocr_event_extraction?: { events: unknown[] } })
    ?.ocr_event_extraction?.events.length ?? 0;
assert.ok(eventCount >= 5);

orchestrateUserMessage({
  message: "첨부한 자료를 한 번에 분석해줘",
  composerContext: ocrBlock,
  masterContext: { currentDate: REF },
  history: [],
})
  .then((viaPipeline) => {
    assert.ok(viaPipeline.summary.includes("일정 후보"));
    assert.ok(!viaPipeline.summary.includes("무엇을 도와드릴까요"));

    const emptyOcr = orchestrateOcrScheduleCandidates({
      composerContext: "[첨부1·사진] OCR.png (분석 실패 — 파일명만 참고)",
      referenceDate: REF,
    });
    assert.ok(emptyOcr?.summary.includes("글자를 읽지 못했어요"));

    console.log("test-ocr-schedule-orchestrate: ok");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
