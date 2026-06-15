#!/usr/bin/env npx tsx

import { chromium } from "@playwright/test";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("http://localhost:3000/?resetFeed=1", {
    waitUntil: "networkidle",
  });

  await page.waitForTimeout(1500);

  const state = await page.evaluate(() => ({
    v1: localStorage.getItem("rimvio.sample-feed.v1"),
    v2: localStorage.getItem("rimvio.sample-feed.v2"),
    links: localStorage.getItem("blink-local-links"),
    dismissed: localStorage.getItem("blink-dismissed-link-ids"),
    url: window.location.href,
    sampleBadges: document.body.innerText.includes("예시"),
  }));

  console.log("reset-feed verify:", state);

  if (state.links !== "[]" && state.links !== null) {
    console.error("expected empty blink-local-links");
    process.exit(1);
  }

  if (state.v2 === "true" || state.v2?.includes('"dismissed":true')) {
    console.error("sample feed still dismissed");
    process.exit(1);
  }

  await browser.close();
  console.log("reset-feed-browser: ok");
}

void main();
