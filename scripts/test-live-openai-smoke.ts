#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadEnvLocal, envKeyStatus } from "../lib/test/load-env-local";
import { processCaptureImageBuffer } from "../lib/capture/process-capture-image";
import { shouldSkipCaptureGemini } from "../lib/capture/commerce-capture-fast-path";
import { classifyUrlIntent } from "../lib/intent/gemini-url-intent";
import { buildSampleFeedLinks } from "../lib/onboarding/sample-feed-links";
import { deriveCommerceVerdictPresentation } from "../lib/commerce/commerce-verdict-presentation";
import { buildProvisionalMarketSnapshot } from "../lib/commerce/client-market-estimate";
import {
  captureVisionProvider,
  isCaptureVisionConfigured,
} from "../lib/locate/vision-provider-config";
import { isAuthoritativeCaptureVision } from "../lib/capture/resolve-capture-pipeline-order";

loadEnvLocal();

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const key of [
    "OPENAI_API_KEY",
    "CAPTURE_VISION_PROVIDER",
    "OPENAI_VISION_MODEL",
  ]) {
    const match = fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith(`${key}=`));
    if (match) {
      process.env[key] = match.slice(key.length + 1).trim();
    }
  }
}

delete process.env.GOOGLE_CLOUD_VISION_API_KEY;

type CaseResult = {
  name: string;
  ok: boolean;
  detail: string;
  ms?: number;
};

const results: CaseResult[] = [];

function record(name: string, ok: boolean, detail: string, ms?: number) {
  results.push({ name, ok, detail, ms });
  const mark = ok ? "✓" : "✗";
  console.log(`${mark} ${name}${ms ? ` (${ms}ms)` : ""}`);
  console.log(`  ${detail}`);
}

async function fetchTestImage() {
  const url =
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=640&auto=format&fit=crop&q=80";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`image_fetch_${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, mimeType: "image/jpeg" as const };
}

async function testHttpCapture(buffer: Buffer, mimeType: string) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([buffer], { type: mimeType }),
    "ramen.jpg"
  );

  const response = await fetch("http://localhost:3000/api/capture/process", {
    method: "POST",
    body: form,
  });

  const json = (await response.json()) as {
    captureVision?: { type?: string; search_query?: string | null };
    pipeline?: { source?: string };
    fallback?: string;
  };

  return { status: response.status, json };
}

async function main() {
  console.log("=== Rimvio live smoke (OpenAI + pipeline) ===\n");

  const keys = envKeyStatus([
    "OPENAI_API_KEY",
    "CAPTURE_VISION_PROVIDER",
    "GOOGLE_CLOUD_VISION_API_KEY",
  ]);
  console.log("env:", keys);
  console.log("provider:", captureVisionProvider());
  console.log("vision configured:", isCaptureVisionConfigured());
  console.log("");

  record(
    "provider=openai",
    captureVisionProvider() === "openai" && isCaptureVisionConfigured(),
    `provider=${captureVisionProvider()}`
  );

  record(
    "commerce fast-path",
    shouldSkipCaptureGemini("[급처] 아이폰 15 Pro 256GB 850,000원"),
    "priced secondhand OCR skips vision LLM"
  );

  const commerce = buildSampleFeedLinks()[0]!;
  const market = buildProvisionalMarketSnapshot({
    title: commerce.title,
    domain: commerce.domain,
  });
  const verdict = deriveCommerceVerdictPresentation({ market });
  record(
    "sample commerce verdict",
    Boolean(verdict && verdict.kind !== "pending" && verdict.isEstimated),
    `${verdict?.stampLabel ?? "?"} — ${verdict?.subline?.slice(0, 48) ?? ""}`
  );

  const startedUrl = Date.now();
  const urlIntent = await classifyUrlIntent({
    url: "https://example.com/landing",
    metadata: {
      url: "https://example.com/landing",
      domain: "example.com",
      title: "Summer sale — limited drop",
      description: "Shop sneakers and hoodies up to 40% off",
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      siteName: null,
    },
  });
  record(
    "url intent (ambiguous → LLM)",
    urlIntent.category === "commerce" || urlIntent.category === "unknown",
    `${urlIntent.category} conf=${urlIntent.confidence_score.toFixed(2)} via ${urlIntent.fallback}`,
    Date.now() - startedUrl
  );

  try {
    const { buffer, mimeType } = await fetchTestImage();
    const startedCapture = Date.now();
    const processed = await processCaptureImageBuffer({ buffer, mimeType });
    const vision = processed.captureVision;
    const smart =
      processed.pipeline.source === "vision" ||
      processed.pipeline.source === "study_domain" ||
      (processed.fallback === "gemini" && Boolean(vision?.search_query));

    record(
      "capture pipeline (ramen photo)",
      smart,
      `source=${processed.pipeline.source} type=${vision?.type ?? "-"} query=${vision?.search_query ?? "(none)"} authoritative=${isAuthoritativeCaptureVision(vision)}`,
      Date.now() - startedCapture
    );

    const startedHttp = Date.now();
    const http = await testHttpCapture(buffer, mimeType);
    const httpVision = http.json.captureVision;
    record(
      "HTTP /api/capture/process",
      http.status === 200 && Boolean(httpVision?.search_query || http.json.pipeline?.source),
      `status=${http.status} source=${http.json.pipeline?.source ?? "-"} query=${httpVision?.search_query ?? "(none)"}`,
      Date.now() - startedHttp
    );
  } catch (error) {
    record(
      "capture pipeline (ramen photo)",
      false,
      error instanceof Error ? error.message : String(error)
    );
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
