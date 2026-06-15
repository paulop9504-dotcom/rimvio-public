#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  looksLikeVisionNoiseQuery,
  sanitizeCaptureVisionResult,
  VISION_LOW_CONFIDENCE_REASON,
} from "../lib/capture/vision-result-guard";

assert.equal(looksLikeVisionNoiseQuery("va BE — - IE 수스 Tu Am"), true);
assert.equal(looksLikeVisionNoiseQuery("N RAL - 4 r oe"), true);
assert.equal(looksLikeVisionNoiseQuery("5 SoNg, EN ))"), true);
assert.equal(looksLikeVisionNoiseQuery("5 SoNg EN ))"), true);
assert.equal(looksLikeVisionNoiseQuery("떡반집 갈마점"), false);
assert.equal(looksLikeVisionNoiseQuery("T104S-5RAL03N 터치패널"), false);
assert.equal(looksLikeVisionNoiseQuery("LG 터치패널 T104S"), false);

const lowConfidence = sanitizeCaptureVisionResult({
  type: "locate",
  search_query: "떡반집",
  place_name_or_product: "떡반집",
  confidence_score: 0.42,
  reasoning_path: "guess",
  is_ocr_relied: false,
});

assert.equal(lowConfidence.type, "unknown");
assert.equal(lowConfidence.search_query, null);
assert.equal(lowConfidence.reasoning_path, VISION_LOW_CONFIDENCE_REASON);

const noisyQuery = sanitizeCaptureVisionResult({
  type: "product_search",
  search_query: "N RAL - 4 r oe",
  confidence_score: 0.88,
  is_ocr_relied: false,
});

assert.equal(noisyQuery.type, "unknown");

const wallGraffitiGemini = sanitizeCaptureVisionResult({
  type: "product_search",
  search_query: "5 SoNg, EN ))",
  confidence_score: 0.88,
  is_ocr_relied: false,
});

assert.equal(wallGraffitiGemini.type, "unknown");
assert.equal(wallGraffitiGemini.search_query, null);

const ocrReliedLocate = sanitizeCaptureVisionResult({
  type: "locate",
  search_query: "떡반집",
  confidence_score: 0.9,
  is_ocr_relied: true,
});

assert.equal(ocrReliedLocate.type, "unknown");

const validUtility = sanitizeCaptureVisionResult({
  type: "utility",
  search_query: "123-456-789012",
  confidence_score: 0.85,
  is_ocr_relied: true,
});

assert.equal(validUtility.type, "utility");
assert.equal(validUtility.search_query, "123-456-789012");

const barcodeDigitsOnly = sanitizeCaptureVisionResult({
  type: "barcode_qr",
  search_query: "8801043012345",
  confidence_score: 0.9,
  is_ocr_relied: false,
});

assert.equal(barcodeDigitsOnly.type, "unknown");

const barcodeFused = sanitizeCaptureVisionResult({
  type: "barcode_qr",
  search_query: "농심 신라면 최저가",
  place_name_or_product: "농심 신라면",
  barcode_number: "8801043012345",
  confidence_score: 0.88,
  is_ocr_relied: false,
});

assert.equal(barcodeFused.type, "barcode_qr");

const qrUrlOnly = sanitizeCaptureVisionResult({
  type: "barcode_qr",
  search_query: null,
  target_url: "https://pay.kakao.com/link/abc",
  confidence_score: 0.82,
  is_ocr_relied: false,
});

assert.equal(qrUrlOnly.type, "barcode_qr");
assert.equal(qrUrlOnly.target_url, "https://pay.kakao.com/link/abc");

console.log("test-vision-guard: ok");
