#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildTrueCostReceipt } from "../lib/commerce/true-cost-receipt";
import {
  commerceInsightDockLabel,
  insightDockCollapseLabel,
  studyInsightDockLabel,
  timeInsightDockLabel,
} from "../lib/feed/insight-dock-label";
import { buildStudyReceipt } from "../lib/study/build-study-receipt";

const study = buildStudyReceipt({
  title: "Physics of the Soul",
  ocrText: "Quantum consciousness theory. Page 47 discusses measurement.",
});

assert.ok(study.available);
assert.match(studyInsightDockLabel(study), /시험 포스트잇 · Physics/);

const trueCost = buildTrueCostReceipt({
  title: "북미 아이패드 프로 m4",
  domain: "web.joongna.com",
  surfacePrice: 1_300_000,
});

assert.match(
  commerceInsightDockLabel({ trueCost }),
  /중고 영수증 · (EST\. )?HOLD · 보유 손실 예상/
);

assert.match(
  timeInsightDockLabel({
    available: true,
    kind: "article",
    kindLabel: "읽기",
    headline: "약 8분 읽기",
    detail: "test",
    disclaimer: "test",
    lines: [],
  }),
  /시간 영수증 · 약 8분/
);

assert.equal(
  insightDockCollapseLabel({ kind: "study", overlay: true }),
  "원문 보기"
);
assert.equal(
  insightDockCollapseLabel({ kind: "commerce", overlay: true }),
  "배경 보기"
);
assert.equal(
  insightDockCollapseLabel({ kind: "commerce", overlay: false }),
  "접기"
);

console.log("test-insight-dock-label: ok");
