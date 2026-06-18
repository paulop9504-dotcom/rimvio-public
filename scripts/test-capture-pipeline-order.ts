#!/usr/bin/env npx tsx
/**
 * Vision-first capture pipeline order — Gemini bypasses OCR regex router.
 * Usage: npm run test:capture-pipeline-order
 */

import assert from "node:assert/strict";
import { UNIVERSAL_PILLAR_LABEL } from "../lib/actions/universal-action-pillar";
import { detectCaptureIntent } from "../lib/capture/detect-capture-intent";
import {
  inferredIntentFromAuthoritativeVision,
  isAuthoritativeCaptureVision,
  resolveCapturePipelineDecision,
  resolveOcrFallbackIntent,
} from "../lib/capture/resolve-capture-pipeline-order";
import { resolveInferredCaptureIntent } from "../lib/capture/resolve-inferred-query";
import { buildScreenshotActions } from "../lib/screenshot/build-screenshot-actions";
import { classifyUrlIntentFromRouter } from "../lib/intent/gemini-url-intent";
import { sanitizeCaptureVisionResult } from "../lib/capture/vision-result-guard";
import { screenshotLinkTitle } from "../lib/screenshot/build-screenshot-actions";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

const garbledOcr = "va BE — - IE 수스 Tu Am AM ATT 0 WW 4S";

test("authoritative locate vision bypasses garbled OCR product routing", () => {
  const legacy = detectCaptureIntent({
    text: garbledOcr,
    vision: {
      bestGuessLabels: ["Tteokbokki"],
      labels: ["Food", "Dish"],
    },
  });

  assert.equal(legacy?.kind, "place", "legacy router still maps garbled food to place");

  const captureVision = {
    type: "locate" as const,
    search_query: "떡반집 갈마점",
    place_name: "떡반집 갈마점",
    confidence_score: 0.88,
    reasoning_path: "떡반+떡볶이 시그니처",
    is_ocr_relied: false,
  };

  assert.equal(isAuthoritativeCaptureVision(captureVision), true);

  const pipeline = resolveCapturePipelineDecision({
    captureVision,
    ocrText: garbledOcr,
  });

  assert.equal(pipeline.source, "vision");
  if (pipeline.source !== "vision") {
    return;
  }

  assert.equal(pipeline.intent.kind, "place");
  assert.equal(pipeline.inferredCaptureIntent.search_query, "떡반집 갈마점");
  assert.equal(pipeline.inferredCaptureIntent.is_ocr_relied, false);
  assert.notEqual(pipeline.inferredCaptureIntent.search_query, legacy?.query);

  const actions = buildScreenshotActions(pipeline.intent, {
    captureVision,
    inferredCaptureIntent: pipeline.inferredCaptureIntent,
  });
  assert.equal(actions[0]?.label, UNIVERSAL_PILLAR_LABEL.go);
});

test("unknown vision falls through to OCR path", () => {
  const captureVision = {
    type: "unknown" as const,
    search_query: null,
    confidence_score: 0.2,
    reasoning_path: "식별 불가",
    is_ocr_relied: false,
  };

  assert.equal(isAuthoritativeCaptureVision(captureVision), false);

  const pipeline = resolveCapturePipelineDecision({
    captureVision,
    ocrText: garbledOcr,
  });

  assert.equal(pipeline.source, "ocr");
});

test("low-confidence vision does not hijack pipeline", () => {
  const captureVision = {
    type: "product_search" as const,
    search_query: "터치패널 T104S",
    confidence_score: 0.35,
    reasoning_path: "불확실",
    is_ocr_relied: false,
  };

  assert.equal(isAuthoritativeCaptureVision(captureVision), false);
});

test("ocr-relied vision defers to OCR fallback path", () => {
  const captureVision = {
    type: "utility" as const,
    search_query: "123-456-789012",
    confidence_score: 0.9,
    reasoning_path: "계좌번호 OCR",
    is_ocr_relied: true,
  };

  assert.equal(isAuthoritativeCaptureVision(captureVision), false);

  const pipeline = resolveCapturePipelineDecision({
    captureVision,
    ocrText: "국민은행 123-456-789012",
  });

  assert.equal(pipeline.source, "ocr");
});

test("inferredIntentFromAuthoritativeVision never merges legacy query", () => {
  const inferred = inferredIntentFromAuthoritativeVision(
    {
      type: "product_search",
      search_query: "LG 터치패널 T104S",
      product_name: "LG 터치패널 T104S",
      confidence_score: 0.91,
      reasoning_path: "제품 형태 + 모델명",
      is_ocr_relied: false,
    },
    "N RAL - 4 r oe"
  );

  assert.equal(inferred.search_query, "LG 터치패널 T104S");
  assert.equal(inferred.is_ocr_relied, false);
  assert.doesNotMatch(inferred.search_query, /RAL/);
});

test("resolveOcrFallbackIntent prefers API intent over regex", () => {
  const apiIntent = {
    kind: "place" as const,
    query: "떡반집 갈마점",
    ocrText: "va BE noise",
  };

  const resolved = resolveOcrFallbackIntent({
    ocr: {
      text: "va BE noise",
      intent: apiIntent,
      refinement: { source: "llm", kind: "place", query: "떡반집 갈마점" },
    },
  });

  assert.equal(resolved?.kind, "place");
  assert.equal(resolved?.query, "떡반집 갈마점");
});

test("intelligent-router short-circuits YouTube without Gemini", () => {
  const result = classifyUrlIntentFromRouter({
    url: "https://www.youtube.com/watch?v=abc",
    domain: "youtube.com",
    title: "Live performance",
  });

  assert.equal(result?.category, "media");
  assert.equal(result?.fallback, "rules");
  assert.ok((result?.confidence_score ?? 0) >= 0.82);
});

test("wall graffiti Gemini product_search sanitized → food OCR fallback", () => {
  const wallOcr = "5 SoNg, EN ))";
  const foodVision = {
    bestGuessLabels: ["Tteokbokki"],
    labels: ["Food", "Dish", "Toast", "Korean food"],
  };

  const captureVision = sanitizeCaptureVisionResult({
    type: "product_search",
    search_query: wallOcr,
    confidence_score: 0.88,
    reasoning_path: "OCR fragment mistaken for product",
    is_ocr_relied: false,
  });

  assert.equal(isAuthoritativeCaptureVision(captureVision), false);

  const pipeline = resolveCapturePipelineDecision({
    captureVision,
    ocrText: wallOcr,
  });

  assert.equal(pipeline.source, "ocr");

  const intent = detectCaptureIntent({
    text: wallOcr,
    vision: foodVision,
  });

  assert.equal(intent?.kind, "place");
  assert.equal(intent?.query, "떡반집");

  const title = screenshotLinkTitle(intent!, { vision: foodVision });
  assert.equal(title, "떡반집");

  const actions = buildScreenshotActions(intent!, { vision: foodVision });
  assert.equal(actions.length, 4);
  assert.equal(actions[0]?.label, UNIVERSAL_PILLAR_LABEL.go);
  assert.ok(
    actions.every((action) =>
      Object.values(UNIVERSAL_PILLAR_LABEL).includes(action.label)
    ),
    `expected universal pillars, got: ${actions.map((a) => a.label).join(", ")}`
  );
  assert.ok(
    !actions.some((action) => /알맞은 곳에서 비교/.test(action.label)),
    "wall graffiti must not route to marketplace compare"
  );
});

test("Tier 2 vision law blocks clean OCR override", () => {
  const inferred = resolveInferredCaptureIntent({
    intent: {
      kind: "product",
      query: "wrong regex product name",
      ocrText: "wrong regex product name",
    },
    captureVision: {
      type: "locate",
      search_query: "떡반집 갈마점",
      confidence_score: 0.88,
      reasoning_path: "Gemini place vision",
      is_ocr_relied: false,
    },
  });

  assert.equal(inferred.search_query, "떡반집 갈마점");
  assert.equal(inferred.is_ocr_relied, false);
  assert.match(inferred.reasoning_path, /Tier 2|Gemini/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
