#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  captureVisionProvider,
  isCaptureVisionConfigured,
} from "../lib/locate/vision-provider-config";

const originalProvider = process.env.CAPTURE_VISION_PROVIDER;
const originalOpenAi = process.env.OPENAI_API_KEY;
const originalGemini = process.env.GEMINI_API_KEY;

function restoreEnv() {
  if (originalProvider === undefined) {
    delete process.env.CAPTURE_VISION_PROVIDER;
  } else {
    process.env.CAPTURE_VISION_PROVIDER = originalProvider;
  }

  if (originalOpenAi === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAi;
  }

  if (originalGemini === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGemini;
  }
}

try {
  process.env.CAPTURE_VISION_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.GEMINI_API_KEY = "AIza-test";
  assert.equal(captureVisionProvider(), "openai");
  assert.equal(isCaptureVisionConfigured(), true);

  process.env.CAPTURE_VISION_PROVIDER = "gemini";
  assert.equal(captureVisionProvider(), "gemini");
  assert.equal(isCaptureVisionConfigured(), true);

  delete process.env.GEMINI_API_KEY;
  delete process.env.CAPTURE_VISION_PROVIDER;
  process.env.OPENAI_API_KEY = "sk-test";
  assert.equal(captureVisionProvider(), "openai");
} finally {
  restoreEnv();
}

console.log("test-vision-provider-config: ok");
