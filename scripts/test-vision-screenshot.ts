#!/usr/bin/env npx tsx
/**
 * Google Vision parsing + fashion image search actions.
 * Usage: npm run test:vision
 */

import assert from "node:assert/strict";
import { buildScreenshotActions } from "../lib/screenshot/build-screenshot-actions";
import { classifyScreenshotInput } from "../lib/screenshot/classify-intent";
import {
  isFashionVision,
  parseGoogleVisionResponse,
  visionSearchQuery,
} from "../lib/vision/parse-vision-response";

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

test("parseGoogleVisionResponse extracts OCR + fashion labels", () => {
  const vision = parseGoogleVisionResponse({
    responses: [
      {
        fullTextAnnotation: { text: "ZARA linen blazer\n₩129,000" },
        labelAnnotations: [{ description: "Clothing", score: 0.95 }],
        webDetection: {
          bestGuessLabels: [{ label: "beige linen blazer" }],
          webEntities: [{ description: "Blazer", score: 0.8 }],
        },
      },
    ],
  });

  assert.ok(vision);
  assert.match(vision!.text, /blazer/i);
  assert.ok(isFashionVision(vision));
  assert.equal(visionSearchQuery(vision), "beige linen blazer");
});

test("classifyScreenshotInput uses vision label when OCR is weak", () => {
  const vision = parseGoogleVisionResponse({
    responses: [
      {
        fullTextAnnotation: { text: "" },
        labelAnnotations: [{ description: "Dress", score: 0.9 }],
        webDetection: {
          bestGuessLabels: [{ label: "black midi dress" }],
        },
      },
    ],
  });

  const intent = classifyScreenshotInput({ text: "", vision: vision! });
  assert.ok(intent);
  assert.equal(intent!.kind, "product");
  assert.match(intent!.query, /dress/i);
});

test("fashion product screenshot adds image search actions", () => {
  const vision = parseGoogleVisionResponse({
    responses: [
      {
        fullTextAnnotation: { text: "MUJI cotton shirt" },
        labelAnnotations: [{ description: "Shirt", score: 0.9 }],
        webDetection: {
          bestGuessLabels: [{ label: "white cotton shirt" }],
        },
      },
    ],
  });

  const intent = classifyScreenshotInput({
    text: "MUJI cotton shirt",
    vision: vision!,
  });

  assert.ok(intent);
  const actions = buildScreenshotActions(intent!, { vision: vision! });
  assert.ok(actions.some((action) => /이 스타일로 쇼핑 검색/.test(action.label)));
  assert.ok(actions.some((action) => /무신사/.test(action.label)));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
