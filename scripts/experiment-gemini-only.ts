#!/usr/bin/env npx tsx
/**
 * Gemini-only image analysis — skips Google Cloud Vision entirely.
 * Usage: npm run experiment:food-photo:gemini
 */

import fs from "node:fs";
import path from "node:path";
import { loadEnvLocal, envKeyStatus } from "../lib/test/load-env-local";
import { extractCaptureVisionFromImage } from "../lib/locate/gemini-place-vision";
import { isAuthoritativeCaptureVision } from "../lib/capture/resolve-capture-pipeline-order";
import { resolveCapturePipelineDecision } from "../lib/capture/resolve-capture-pipeline-order";
import { buildScreenshotActions, screenshotLinkTitle } from "../lib/screenshot/build-screenshot-actions";
import { captureKindFromVisionType } from "../lib/capture/resolve-capture-pipeline-order";

loadEnvLocal();
delete process.env.GOOGLE_CLOUD_VISION_API_KEY;

const imagePath = path.resolve(
  process.argv[2] ?? path.join(process.cwd(), "test-fixtures/tteokbanjip-food.png")
);

if (!fs.existsSync(imagePath)) {
  console.error(`Image not found: ${imagePath}`);
  process.exit(1);
}

const buffer = fs.readFileSync(imagePath);
const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

const keyStatus = envKeyStatus(["GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"]);

console.log("=== Gemini-only experiment ===");
console.log(`image: ${imagePath} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
console.log("gemini configured?", keyStatus.GEMINI_API_KEY || keyStatus.GOOGLE_GEMINI_API_KEY);

if (!keyStatus.GEMINI_API_KEY && !keyStatus.GOOGLE_GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY — use AIza... key from https://aistudio.google.com/app/apikey");
  process.exit(1);
}

async function main() {
  const started = Date.now();

  let vision;
  try {
    vision = await extractCaptureVisionFromImage({
      buffer,
      mimeType,
      webContext: null,
      store: null,
    });
  } catch (error) {
    console.error("\nGemini call failed:");
    console.error(error instanceof Error ? error.message : error);
    console.error("\nTip: GEMINI_API_KEY must start with AIza... from AI Studio, not Cloud Console OAuth token.");
    process.exit(1);
  }

  console.log("\n--- Gemini captureVision ---");
  console.log("type:", vision.type);
  console.log("search_query:", vision.search_query);
  console.log("confidence:", vision.confidence_score);
  console.log("reasoning:", vision.reasoning_path);
  console.log("authoritative?", isAuthoritativeCaptureVision(vision));
  console.log("durationMs:", Date.now() - started);

  const pipeline = resolveCapturePipelineDecision({
    captureVision: vision,
    ocrText: "",
  });

  if (pipeline.source !== "vision") {
    console.log("\nverdict: Gemini did not produce authoritative vision — check key/model");
    process.exit(1);
  }

  const intent = pipeline.intent;
  const title = screenshotLinkTitle(intent, {
    captureVision: vision,
    inferredCaptureIntent: pipeline.inferredCaptureIntent,
  });
  const actions = buildScreenshotActions(intent, {
    captureVision: vision,
    inferredCaptureIntent: pipeline.inferredCaptureIntent,
  });

  console.log("\n--- UI ---");
  console.log("title:", title);
  console.log("kind:", captureKindFromVisionType(vision.type!));
  console.log("actions:", actions.slice(0, 4).map((a) => a.label).join(" | "));

  const ok =
    /떡반집|tteok|맛집|떡볶/i.test(title) &&
    !/5\s*SoNg|SoNg,\s*EN/i.test(title) &&
    actions.some((a) => /길찾기|네이버|배민|카카오|캐치테이블/i.test(a.label));

  console.log("\nverdict:", ok ? "ok" : "needs review");
  process.exit(ok ? 0 : 1);
}

main();
