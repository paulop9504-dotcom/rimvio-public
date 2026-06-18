#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  resolveDomainConfidence,
  routeCaptureEssentialDomain,
} from "../lib/capture/capture-domain-router";
import { analyzeCaptureLayout } from "../lib/capture/capture-layout-analyzer";
import { detectCaptureIntent } from "../lib/capture/detect-capture-intent";
import { resolveCapturePipelineDecision } from "../lib/capture/resolve-capture-pipeline-order";
import { shouldPrefilterAsStudy } from "../lib/capture/study-vocabulary";

const physicsBook = [
  "Physics of the Soul",
  "47",
  "The Changing View of God",
  "We call this the quantum self, the subject that has complete freedom of choice in the process of quantum measurement.",
  "God is not a king on a throne but the Creative Principle within science and consciousness.",
  "Mitchell and Goswami (1992) showed how memory afterimages shape what we perceive as reality.",
].join("\n");

assert.equal(routeCaptureEssentialDomain({ rawText: physicsBook }), "STUDY");

const medicineLabel = [
  "Tylenol 500mg",
  "복용법: 1정 8시간마다",
  "주의: 간 질환자 복용 전 상담",
  "약국 조제",
].join("\n");

assert.equal(routeCaptureEssentialDomain({ rawText: medicineLabel }), "MEDICAL");

const mixedAcademicWithMg = [
  "Philosophy of Medicine",
  "Chapter 3",
  "The concept of healing involves 500mg metaphors in historical texts about dosage ethics and patient care narratives in academic literature.",
  "Students should compare Mitchell (1992) with contemporary bioethics essays.",
].join("\n");

assert.equal(
  routeCaptureEssentialDomain({ rawText: mixedAcademicWithMg }),
  "STUDY",
  "STUDY priority over incidental medical tokens"
);

const heideggerNotes = [
  "Being and Time — 요약",
  "하이데거는 Dasein의 존재를 현존재의 시간성으로 이해한다.",
  "의식과 존재의 관계를 분석할 때, 개념 정리와 암기 포인트를 구분해야 한다.",
].join("\n");

assert.ok(shouldPrefilterAsStudy(heideggerNotes), "K-stage vocabulary pre-filter");
assert.equal(detectCaptureIntent({ text: heideggerNotes })?.kind, "document_study");

const confidence = resolveDomainConfidence({ rawText: physicsBook });
assert.ok(
  confidence.studyConfidence >= 0.7 || confidence.winnerTakeAll || confidence.forcedStudy,
  "L-stage winner-take-all for dense academic prose"
);

const layout = analyzeCaptureLayout({ rawText: physicsBook });
assert.ok(layout.lineDensity > 0.7 && layout.isParagraph, "line density hard rule inputs");

const geminiProductVision = {
  type: "product_search" as const,
  search_query: "Tylenol 500mg",
  confidence_score: 0.91,
  reasoning_path: "pill packaging",
  is_ocr_relied: false,
};

const studyOverride = resolveCapturePipelineDecision({
  captureVision: geminiProductVision,
  ocrText: physicsBook,
  vision: {
    bestGuessLabels: ["Book"],
    webEntities: ["Publication"],
    labels: ["Book", "Publication"],
    fashionScore: 0,
    provider: "google_vision",
    text: physicsBook,
    pagesWithMatchingImages: [],
    visuallySimilarPages: [],
    similarImageResults: [],
  },
});

assert.equal(studyOverride.source, "study_domain", "E-stage STUDY overrides authoritative Gemini");
if (studyOverride.source === "study_domain") {
  assert.equal(studyOverride.intent.kind, "document_study");
}

assert.equal(detectCaptureIntent({ text: physicsBook })?.kind, "document_study");
assert.equal(detectCaptureIntent({ text: medicineLabel })?.kind, "medicine");

const fashionProduct = {
  text: "MUJI cotton shirt",
  vision: {
    bestGuessLabels: ["white cotton shirt"],
    webEntities: ["Shirt"],
    labels: ["Clothing", "Shirt"],
    fashionScore: 3,
  },
};

assert.equal(
  routeCaptureEssentialDomain({
    rawText: fashionProduct.text,
    vision: fashionProduct.vision,
  }),
  "OTHER",
  "Fashion product must not route to STUDY"
);

console.log("test-capture-domain-router: ok");
