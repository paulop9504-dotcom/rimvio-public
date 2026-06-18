/**
 * Capture /feed console + page errors (local or production).
 * Run: npx tsx scripts/probe-feed-page.ts [baseUrl]
 */

import { chromium } from "@playwright/test";

const base = process.argv[2]?.trim() || "http://localhost:3000";
const target = `${base.replace(/\/$/u, "")}/feed`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLines: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleLines.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  let status = 0;
  try {
    const res = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45_000 });
    status = res?.status() ?? 0;
    await page.waitForTimeout(4000);
  } catch (error) {
    pageErrors.push(error instanceof Error ? error.message : String(error));
  }

  const title = await page.title().catch(() => "");
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const hasFeedError = /피드를 불러오지 못했어요/u.test(bodyText);
  const hasToday = /오늘/u.test(bodyText);
  const hasLogin = /Google로|로그인/u.test(bodyText);

  console.log(JSON.stringify({
    target,
    status,
    title,
    hasFeedError,
    hasToday,
    hasLogin,
    bodySnippet: bodyText.slice(0, 500),
    pageErrors,
    consoleLines: consoleLines.slice(0, 20),
  }, null, 2));

  await browser.close();
  if (pageErrors.length > 0 || hasFeedError) {
    process.exitCode = 1;
  }
}

void main();
