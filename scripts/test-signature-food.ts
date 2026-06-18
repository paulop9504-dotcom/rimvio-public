#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { UNIVERSAL_PILLAR_LABEL } from "../lib/actions/universal-action-pillar";
import { detectCaptureIntent } from "../lib/capture/detect-capture-intent";import { inferSignatureFoodPlace } from "../lib/capture/infer-signature-food-place";
import { buildScreenshotActions, screenshotLinkTitle } from "../lib/screenshot/build-screenshot-actions";

import type { VisionSnapshot } from "../lib/vision/types";

const tteokbanVision = {
  bestGuessLabels: ["Tteokbokki"],
  labels: ["Food", "Dish", "Toast", "Korean food", "Sandwich"],
} as unknown as VisionSnapshot;

assert.equal(inferSignatureFoodPlace(tteokbanVision), "떡반집");

const garbledOcr = "5 SoNg, EN )) va BE — - IE";

const intent = detectCaptureIntent({
  text: garbledOcr,
  vision: tteokbanVision,
});

assert.equal(intent?.kind, "place", "garbled wall OCR + food vision must not become product");
assert.equal(intent?.query, "떡반집");

const title = screenshotLinkTitle(intent!, { vision: tteokbanVision });
assert.equal(title, "떡반집");

const actions = buildScreenshotActions(intent!, { vision: tteokbanVision });
assert.equal(actions.length, 4);
assert.equal(actions[0]?.label, UNIVERSAL_PILLAR_LABEL.go);
assert.ok(
  actions.every((action) =>
    Object.values(UNIVERSAL_PILLAR_LABEL).includes(action.label)
  ),
  `expected universal pillars, got: ${actions.map((a) => a.label).join(", ")}`
);assert.ok(
  !actions.some((action) => /알맞은 곳에서 비교/.test(action.label)),
  "food photo should not show marketplace compare primary"
);

console.log("test-signature-food: ok");
