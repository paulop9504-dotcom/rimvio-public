#!/usr/bin/env npx tsx
/**
 * Capture PWA / store listing screenshots.
 * Usage: npm run store:screenshots
 * Requires dev server on :3001 OR starts one via playwright.
 */

import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "@playwright/test";

const BASE =
  process.env.STORE_SHOT_BASE?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "") ||
  "https://rimvio.app";
const OUT_DIR = path.join(process.cwd(), "public", "store");

async function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function capture() {
  await ensureOutDir();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ko-KR",
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/peers`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(OUT_DIR, "peers-mobile.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(OUT_DIR, "feed-mobile.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/welcome?manual=1`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(OUT_DIR, "welcome-mobile.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto(`${BASE}/welcome?draw=1`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(OUT_DIR, "og-cover.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("✓ Store screenshots saved to public/store/");
}

capture().catch((error) => {
  console.error(error);
  process.exit(1);
});
