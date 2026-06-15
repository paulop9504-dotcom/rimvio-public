#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildGeminiCapturePrompt,
  buildGoogleWebContextHint,
  hasGoogleWebHints,
} from "../lib/vision/web-detection-hints";
import { CAPTURE_VISION_PROMPT } from "../lib/locate/gemini-place-vision";

const hint = buildGoogleWebContextHint({
  bestGuessLabels: ["Korean street food"],
  webEntities: ["떡반집", "대전 은행동 떡반집", "Tteokbokki"],
  labels: ["Food", "Dish"],
  text: "5 SoNg EN noise",
});

assert.ok(hasGoogleWebHints({ webEntities: ["떡반집"] }));
assert.match(hint, /webEntities.*떡반집/);
assert.match(hint, /bestGuessLabels/);
assert.match(hint, /wall graffiti/i);

const prompt = buildGeminiCapturePrompt(CAPTURE_VISION_PROMPT, {
  webEntities: ["대전 은행동 떡반집"],
  bestGuessLabels: ["Korean food"],
  labels: [],
  text: "",
});

assert.match(prompt, /Google Web Detection Hybrid/);
assert.match(prompt, /대전 은행동 떡반집/);

console.log("test-web-detection-hints: ok");
