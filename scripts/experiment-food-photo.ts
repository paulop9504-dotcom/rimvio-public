#!/usr/bin/env npx tsx
/**
 * Live capture pipeline experiment with a food photo.
 * Usage: npm run experiment:food-photo [image-path]
 */

import fs from "node:fs";
import path from "node:path";
import { loadEnvLocal, envKeyStatus } from "../lib/test/load-env-local";
import { processCaptureImageBuffer } from "../lib/capture/process-capture-image";
import { buildCapturePayload } from "../lib/screenshot/process-screenshot-server";
import { isAuthoritativeCaptureVision } from "../lib/capture/resolve-capture-pipeline-order";
import { looksLikeVisionNoiseQuery } from "../lib/capture/vision-result-guard";

loadEnvLocal();

const geminiOnly =
  process.argv.includes("--gemini-only") || process.argv.includes("--no-vision");

if (geminiOnly) {
  delete process.env.GOOGLE_CLOUD_VISION_API_KEY;
}

const DEFAULT_IMAGE = path.resolve(
  process.cwd(),
  "test-fixtures/tteokbanjip-food.png"
);
const positionalArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const imagePath = path.resolve(positionalArgs[0] ?? DEFAULT_IMAGE);
if (!fs.existsSync(imagePath)) {
  console.error(`Image not found: ${imagePath}`);
  process.exit(1);
}

const buffer = fs.readFileSync(imagePath);
const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

const keyStatus = envKeyStatus([
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "GOOGLE_CLOUD_VISION_API_KEY",
]);

console.log("=== Rimvio food photo experiment ===");
console.log(`mode: ${geminiOnly ? "gemini-only (no Vision API)" : "vision + gemini"}`);
console.log(`image: ${imagePath} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
console.log("env keys:", keyStatus);

if (!keyStatus.GEMINI_API_KEY && !keyStatus.GOOGLE_GEMINI_API_KEY) {
  console.error("\nMissing GEMINI_API_KEY in .env.local");
  console.error("Get one: https://aistudio.google.com/apikey");
  process.exit(1);
}

if (!geminiOnly && !keyStatus.GOOGLE_CLOUD_VISION_API_KEY) {
  console.error("\nMissing GOOGLE_CLOUD_VISION_API_KEY in .env.local");
  console.error("Enable Vision API: https://console.cloud.google.com/apis/library/vision.googleapis.com");
  console.error("Or run: npm run experiment:food-photo -- --gemini-only");
  process.exit(1);
}

async function main() {
  const started = Date.now();

  const processed = await processCaptureImageBuffer({ buffer, mimeType });
  const payload = await buildCapturePayload({ buffer, mimeType });

  const ocrPreview = processed.ocr.text.replace(/\s+/g, " ").trim().slice(0, 120);
  const vision = processed.captureVision;

  console.log("\n--- pipeline ---");
  console.log("source:", processed.pipeline.source);
  console.log("fallback:", processed.fallback);
  console.log("durationMs:", Date.now() - started);

  console.log("\n--- OCR ---");
  console.log("provider:", processed.ocr.provider);
  console.log("preview:", ocrPreview || "(empty — gemini-only mode)");
  if (ocrPreview) {
    console.log("noise?", looksLikeVisionNoiseQuery(ocrPreview.split(/\s+/).slice(0, 4).join(" ")));
  }

  console.log("\n--- Gemini captureVision ---");
  console.log("type:", vision?.type ?? null);
  console.log("search_query:", vision?.search_query ?? null);
  console.log("confidence:", vision?.confidence_score ?? null);
  console.log("reasoning:", vision?.reasoning_path ?? null);
  console.log("authoritative?", isAuthoritativeCaptureVision(vision));

  console.log("\n--- UI payload ---");
  console.log("title:", payload.title);
  console.log("category:", payload.category);
  console.log("intent.kind:", payload.intent?.kind);
  console.log(
    "actions:",
    payload.actions.slice(0, 4).map((action) => action.label).join(" | ")
  );

  const okTitle =
    /떡반집|tteok|맛집|떡볶/i.test(payload.title) &&
    !/5\s*SoNg|SoNg,\s*EN/i.test(payload.title);
  const okActions = payload.actions.some((action) =>
    /길찾기|네이버|배민|카카오|캐치테이블/i.test(action.label)
  );

  console.log("\n--- verdict ---");
  console.log("title ok?", okTitle);
  console.log("place actions?", okActions);

  if (!okTitle || !okActions) {
    process.exit(1);
  }

  console.log("\nexperiment-food-photo: ok");
}

main().catch((error) => {
  console.error("\nexperiment failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
