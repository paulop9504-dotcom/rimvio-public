#!/usr/bin/env npx tsx
/**
 * QA: bottom nav hit targets + route changes.
 * Run: npx tsx scripts/qa-bottom-nav-touch.ts [baseUrl]
 */
import assert from "node:assert/strict";
import { chromium, type Page } from "@playwright/test";

const base = (process.argv[2]?.trim() || "http://localhost:3000").replace(/\/$/u, "");

type TabResult = {
  href: string;
  found: boolean;
  hit: boolean;
  topTag: string | null;
  navigated: boolean;
  finalUrl: string;
};

async function waitForNav(page: Page) {
  await page.waitForSelector('[data-testid="rimvio-bottom-nav"]', {
    timeout: 20_000,
  });
  await page.waitForSelector('[data-testid="rimvio-bottom-nav"] button[data-nav-href]', {
    timeout: 10_000,
  });
}

async function probeHits(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector('[data-testid="rimvio-bottom-nav"]');
    const anchor = document.getElementById("rimvio-bottom-nav-anchor");
    if (!nav) {
      return { error: "no-nav" as const };
    }

    const navStyle = getComputedStyle(nav);
    const anchorStyle = anchor ? getComputedStyle(anchor) : null;
    const links = Array.from(nav.querySelectorAll("button[data-nav-href]"));

    const samples = links.map((a) => {
      const r = a.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      const hit = top === a || Boolean(top && a.contains(top));
      const topTag = top
        ? `${top.tagName}${top instanceof HTMLElement && top.className ? `.${String(top.className).split(" ")[0]}` : ""}`
        : null;
      return {
        href: a.getAttribute("data-nav-href"),
        hit,
        topTag,
        rect: { top: r.top, bottom: r.bottom, height: r.height },
      };
    });

    return {
      url: location.href,
      anchorId: anchor?.id ?? null,
      portaled:
        nav.parentElement?.id === "rimvio-bottom-nav-anchor" ||
        nav.parentElement === document.body,
      navZ: navStyle.zIndex,
      navPointerEvents: navStyle.pointerEvents,
      anchorZ: anchorStyle?.zIndex ?? null,
      anchorPointerEvents: anchorStyle?.pointerEvents ?? null,
      linkCount: links.length,
      samples,
      bodySnippet: document.body.innerText.slice(0, 160),
    };
  });
}

async function tapTab(page: Page, href: string): Promise<TabResult> {
  const link = page.locator(
    `[data-testid="rimvio-bottom-nav"] button[data-nav-href="${href}"]`,
  );
  const found = (await link.count()) > 0;

  if (!found) {
    return {
      href,
      found: false,
      hit: false,
      topTag: null,
      navigated: false,
      finalUrl: page.url(),
    };
  }

  const hitInfo = await link.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    const hit = top === el || Boolean(top && el.contains(top));
    const topTag = top
      ? `${top.tagName}${top instanceof HTMLElement && top.className ? `.${String(top.className).split(" ")[0]}` : ""}`
      : null;
    return { hit, topTag };
  });

  const box = await link.boundingBox();
  if (box) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    await link.click({ timeout: 8_000, force: false });
  }
  await page.waitForTimeout(1_500);

  const finalUrl = page.url();
  return {
    href,
    found: true,
    hit: hitInfo.hit,
    topTag: hitInfo.topTag,
    navigated: finalUrl.includes(href),
    finalUrl,
  };
}

async function runScenario(startPath: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();

  try {
    const response = await page.goto(`${base}${startPath}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    const status = response?.status() ?? 0;
    const isLoginGate = await page
      .getByText("Google로 시작", { exact: false })
      .isVisible()
      .catch(() => false);

    if (isLoginGate) {
      return {
        startPath,
        status,
        blocked: "auth-gate" as const,
        bodySnippet: await page.locator("body").innerText().then((t) => t.slice(0, 160)),
      };
    }

    await waitForNav(page);
    const before = await probeHits(page);

    const tabs: TabResult[] = [];
    for (const href of ["/", "/peers", "capture"]) {
      await page.goto(`${base}${startPath}`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await waitForNav(page);
      if (href === "capture") {
        const link = page.locator(
          '[data-testid="rimvio-bottom-nav"] button[data-nav-action="capture"]',
        );
        const found = (await link.count()) > 0;
        tabs.push({
          href,
          found,
          hit: found,
          topTag: null,
          navigated: true,
          finalUrl: page.url(),
        });
        if (found) {
          await link.click({ timeout: 8_000 });
          await page.waitForSelector("[data-capture-sheet]", { timeout: 5_000 });
        }
        continue;
      }
      tabs.push(await tapTab(page, href));
    }

    const allHits = before && !("error" in before) && before.samples.every((s) => s.hit);
    const allNavigated = tabs
      .filter((t) => t.found)
      .every((t) => t.href === "capture" || t.navigated);

    return {
      startPath,
      status,
      blocked: null,
      before,
      tabs,
      pass: Boolean(allHits && allNavigated),
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(`qa-bottom-nav-touch: base=${base}`);

  const health = await fetch(`${base}/api/health`).then(
    (res) => res.json().catch(() => ({})),
    () => null,
  );
  console.log("health:", health);

  const home = await runScenario("/peers");
  console.log(JSON.stringify({ home }, null, 2));

  if (home.blocked === "auth-gate") {
    console.error("BLOCKED: AUTH_REQUIRED login gate — cannot QA tab taps without session.");
    process.exitCode = 2;
    return;
  }

  assert.ok(home.before && !("error" in home.before), "bottom nav must render");
  assert.equal(home.before.linkCount, 3, "expected 3 bottom tabs");

  for (const sample of home.before.samples) {
    assert.ok(sample.hit, `hit target blocked for ${sample.href} (top=${sample.topTag})`);
  }

  for (const tab of home.tabs) {
    assert.ok(tab.found, `missing tab ${tab.href}`);
    assert.ok(tab.hit, `tab ${tab.href} not hittable (top=${tab.topTag})`);
    if (tab.href !== "capture") {
      assert.ok(tab.navigated, `tab ${tab.href} did not navigate (stayed at ${tab.finalUrl})`);
    }
  }

  console.log("qa-bottom-nav-touch: PASS");
}

void main().catch((error) => {
  console.error("qa-bottom-nav-touch: FAIL");
  console.error(error);
  process.exitCode = 1;
});
