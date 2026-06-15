#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { UNIVERSAL_PILLAR_LABEL } from "../lib/actions/universal-action-pillar";
import { resolveInferredCaptureIntent } from "../lib/capture/resolve-inferred-query";import { buildCaptureActions } from "../lib/capture/build-capture-actions";
import { detectCaptureIntent } from "../lib/capture/detect-capture-intent";

const garbledFood = detectCaptureIntent({
  text: "va BE — - IE 수스 Tu Am AM ATT 0 WW 4S",
  vision: {
    bestGuessLabels: ["Tteokbokki"],
    labels: ["Food", "Dish", "Korean food"],
  },
});

assert.equal(garbledFood?.kind, "place", "garbled OCR + food vision → place, not foreign_sign");

const foodInferred = resolveInferredCaptureIntent({
  intent: garbledFood!,
  captureVision: {
    type: "locate",
    search_query: "떡반집 갈마점",
    place_name: "떡반집 갈마점",
    confidence_score: 0.88,
    reasoning_path: "떡반+떡볶이+낙서벽 시그니처로 떡반집 추론",
    is_ocr_relied: false,
    context_signal: "📍 대전 떡반집 시그니처(떡반+토스트) · 낙서 벽 분식집",
  },
});

assert.equal(foodInferred.search_query, "떡반집 갈마점");
assert.equal(foodInferred.is_ocr_relied, false);
assert.match(foodInferred.reasoning_path, /떡반/);

const foodActions = buildCaptureActions(foodInferred);
assert.equal(foodActions[0]?.label, UNIVERSAL_PILLAR_LABEL.go);
const productIntent = detectCaptureIntent({
  text: "N RAL - 4 r oe",
  vision: {
    labels: ["Electronics", "Display device"],
  },
});

assert.equal(productIntent?.kind, "product");

const productInferred = resolveInferredCaptureIntent({
  intent: productIntent!,
  captureVision: {
    type: "product_search",
    search_query: "T104S-5RAL03N 터치패널",
    product_name: "T104S-5RAL03N 터치패널",
    model_number: "T104S-5RAL03N",
    confidence_score: 0.91,
    reasoning_path: "검색창 OCR 노이즈 무시, 리스트 UI의 모델명 사용",
    is_ocr_relied: false,
  },
});

assert.equal(productInferred.search_query, "T104S-5RAL03N 터치패널");
assert.equal(productInferred.is_ocr_relied, false);

const productActions = buildCaptureActions(productInferred);
assert.match(productActions[0]?.label ?? "", /최저가/);

const paymentInferred = resolveInferredCaptureIntent({
  intent: detectCaptureIntent({ text: "국민은행 123-456-789012 홍길동" })!,
});

assert.equal(paymentInferred.is_ocr_relied, true);
assert.match(paymentInferred.reasoning_path, /OCR/);

const utilityVisionBlocked = resolveInferredCaptureIntent({
  intent: detectCaptureIntent({ text: "국민은행 123-456-789012 홍길동" })!,
  captureVision: {
    type: "utility",
    search_query: "국민은행 123-456-789012",
    place_name_or_product: "국민은행",
    confidence_score: 0.92,
    reasoning_path: "영수증 표 구조에서 계좌번호 추출",
    is_ocr_relied: true,
  },
});

assert.match(
  utilityVisionBlocked.reasoning_path,
  /구조화 텍스트 intent/,
  "utility vision does not override structured OCR parsers"
);

const unknownVision = resolveInferredCaptureIntent({
  intent: detectCaptureIntent({ text: "blur noise xyz" })!,
  captureVision: {
    type: "unknown",
    search_query: null,
    place_name_or_product: null,
    confidence_score: 0.1,
    reasoning_path: "정보 부족 — 일상 사진으로 판단",
    is_ocr_relied: false,
  },
});

assert.equal(unknownVision.is_ocr_relied, true, "unknown vision falls back to OCR query");

const barcodeInferred = resolveInferredCaptureIntent({
  intent: {
    kind: "product",
    query: "8801043012345",
    ocrText: "8801043012345",
  },
  captureVision: {
    type: "barcode_qr",
    search_query: "농심 신라면 최저가",
    place_name_or_product: "농심 신라면",
    barcode_number: "8801043012345",
    confidence_score: 0.86,
    reasoning_path: "바코드 + 패키지 로고로 신라면 식별",
    is_ocr_relied: false,
  },
});

assert.equal(barcodeInferred.search_query, "농심 신라면 최저가");
assert.equal(barcodeInferred.is_ocr_relied, false);

const urlInferred = resolveInferredCaptureIntent({
  intent: detectCaptureIntent({
    text: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  })!,
  captureVision: {
    type: "content_summary",
    search_query: "Never Gonna Give You Up 요약",
    content_title: "Never Gonna Give You Up",
    target_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    confidence_score: 0.9,
    reasoning_path: "유튜브 썸네일+제목에서 핵심 가치 추출",
    is_ocr_relied: false,
  },
});

assert.equal(urlInferred.search_query, "Never Gonna Give You Up");
assert.equal(urlInferred.content_title, "Never Gonna Give You Up");

const posterInferred = resolveInferredCaptureIntent({
  intent: detectCaptureIntent({
    text: "티켓 Rimvio Launch Party 2026/05/30 COEX Hall A",
  })!,
  captureVision: {
    type: "poster_contact",
    search_query: "Rimvio Launch Party 5/30 COEX",
    place_name_or_product: "Rimvio Launch Party",
    confidence_score: 0.84,
    reasoning_path: "포스터에서 행사명+일시+장소 추출",
    is_ocr_relied: false,
  },
});

assert.match(posterInferred.search_query, /Rimvio Launch Party/);
assert.equal(posterInferred.is_ocr_relied, false);

const weakVisionInferred = resolveInferredCaptureIntent({
  intent: {
    kind: "product",
    query: "N RAL touch panel",
    ocrText: "N RAL touch panel",
  },
  captureVision: {
    type: "product_search",
    search_query: "LG 터치패널 T104S",
    confidence_score: 0.42,
    reasoning_path: "제품 형태 추론",
    is_ocr_relied: false,
  },
});

assert.equal(weakVisionInferred.search_query, "LG 터치패널 T104S");
assert.equal(weakVisionInferred.is_ocr_relied, false);

console.log("test-inferred-query: ok");
