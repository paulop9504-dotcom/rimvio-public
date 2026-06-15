#!/usr/bin/env node
/**
 * Blink Phase A scrape experiment runner
 * Usage: node scripts/experiment-scrape.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

const CASES = [
  {
    name: "YouTube watch",
    url: "https://www.youtube.com/watch?v=yfHasxI_s2A",
    expect: { enricher: "youtube-v1", actionIncludes: "재생" },
  },
  {
    name: "YouTube Shorts",
    url: "https://www.youtube.com/shorts/yfHasxI_s2A",
    expect: { enricher: "youtube-v1", actionIncludes: "Shorts" },
  },
  {
    name: "Naver Map (commute)",
    url: "https://map.naver.com/p/search/%EA%B0%95%EB%A6%89%20%EC%84%B8%EC%9D%B8%ED%8A%B8%EC%A1%B4%EC%A6%88",
    context: { hour: 8, installedApps: ["kakaomap"], locationCategory: "commute" },
    expect: { enricher: "map-v1", actionIncludes: "카카오맵" },
  },
  {
    name: "Naver Map (no kakaomap)",
    url: "https://map.naver.com/p/search/%EA%B0%95%EB%A6%89",
    context: { hour: 14, installedApps: [], locationCategory: "office" },
    expect: { enricher: "map-v1", actionIncludes: "지도" },
  },
  {
    name: "GitHub PR",
    url: "https://github.com/vercel/next.js/pull/12345",
    expect: { enricher: "github-v1", actionIncludes: "PR" },
  },
  {
    name: "GitHub Issue",
    url: "https://github.com/vercel/next.js/issues/12345",
    expect: { enricher: "github-v1", actionIncludes: "이슈" },
  },
  {
    name: "GitHub Repo",
    url: "https://github.com/vercel/next.js",
    expect: { enricher: "github-v1", actionIncludes: "저장소" },
  },
  {
    name: "yo-go commerce",
    url: "https://yo-go.co.kr/",
    expect: { enricher: "commerce-v1", actionIncludes: "타임딜" },
  },
  {
    name: "Naver Map title from URL",
    url: "https://map.naver.com/p/search/%EA%B0%95%EB%A6%89",
    context: { hour: 14, installedApps: [], locationCategory: "office" },
    expect: { enricher: "map-v1", titleIncludes: "강릉" },
  },
  {
    name: "Coupang commerce",
    url: "https://www.coupang.com/vp/products/123456",
    expect: { enricher: "commerce-v1", actionIncludes: "쿠팡" },
  },
  {
    name: "YouTube with t= param",
    url: "https://www.youtube.com/watch?v=yfHasxI_s2A&t=90s",
    expect: { enricher: "youtube-v1", actionIncludes: "1:30" },
  },
  {
    name: "Kakao open chat",
    url: "https://open.kakao.com/o/gsXxUJui",
    expect: { enricher: "kakao-v1", actionIncludes: "오픈채팅" },
  },
  {
    name: "Yanolja transport",
    url: "https://www.yanolja.com/",
    expect: { enricher: "transport-v1", actionIncludes: "숙소" },
  },
  {
    name: "Korail transport",
    url: "https://www.letskorail.com/",
    expect: { enricher: "transport-v1", actionIncludes: "기차" },
  },
  {
    name: "Tmap navigation",
    url: "https://www.tmap.co.kr/",
    expect: { enricher: "transport-v1", actionIncludes: "T맵" },
  },
  {
    name: "Musinsa commerce + app",
    url: "https://www.musinsa.com/products/123456",
    expect: { enricher: "commerce-v1", actionIncludes: "무신사" },
  },
  {
    name: "Baemin delivery",
    url: "https://www.baemin.com/",
    expect: { enricher: "delivery-v1", actionIncludes: "배민" },
  },
  {
    name: "Coupang Eats delivery",
    url: "https://www.coupang.com/eats/store/12345/gyochon-chicken",
    expect: { enricher: "delivery-v1", actionIncludes: "쿠팡이츠", titleIncludes: "gyochon" },
  },
  {
    name: "Klook activity",
    url: "https://www.klook.com/ko/activity/12345/",
    expect: { enricher: "transport-v1", actionIncludes: "액티비티" },
  },
  {
    name: "Trip.com flight",
    url: "https://kr.trip.com/flights/",
    expect: { enricher: "transport-v1", actionIncludes: "항공" },
  },
  {
    name: "Netflix OTT",
    url: "https://www.netflix.com/browse",
    expect: { enricher: "ott-v1", actionIncludes: "Netflix" },
  },
  {
    name: "TVING OTT",
    url: "https://www.tving.com/",
    expect: { enricher: "ott-v1", actionIncludes: "TVING" },
  },
  {
    name: "Melon ticket",
    url: "https://ticket.melon.com/",
    expect: { enricher: "ticket-v1", actionIncludes: "멜론" },
  },
  {
    name: "Interpark ticket path",
    url: "https://ticket.interpark.com/",
    expect: { enricher: "ticket-v1", actionIncludes: "인터파크" },
  },
  {
    name: "Naver blog",
    url: "https://blog.naver.com/",
    expect: { enricher: "naver-v1", actionIncludes: "블로그" },
  },
];

const DEFAULT_CONTEXT = {
  hour: 8,
  installedApps: ["kakaomap"],
  locationCategory: "commute",
};

async function scrape(testCase) {
  const context = testCase.context ?? DEFAULT_CONTEXT;
  const response = await fetch(`${BASE}/api/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: testCase.url, context }),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }

  return response.json();
}

function pass(testCase, result) {
  const issues = [];
  const { expect } = testCase;

  if (expect.enricher && result.enricher_id !== expect.enricher) {
    issues.push(`enricher: got ${result.enricher_id}, want ${expect.enricher}`);
  }

  if (expect.actionIncludes) {
    const labels = result.actions.map((a) => a.label).join(" ");
    if (!labels.includes(expect.actionIncludes)) {
      issues.push(`action missing "${expect.actionIncludes}" in [${labels}]`);
    }
  }

  if (expect.titleMinLen && (!result.title || result.title.length < expect.titleMinLen)) {
    issues.push(`title too short: "${result.title}"`);
  }

  if (expect.titleIncludes && !result.title?.includes(expect.titleIncludes)) {
    issues.push(`title missing "${expect.titleIncludes}" in "${result.title ?? ""}"`);
  }

  return issues;
}

async function main() {
  console.log(`\n👀 Blink scrape experiment @ ${BASE}\n`);
  console.log("─".repeat(72));

  let passed = 0;
  let failed = 0;
  const rows = [];

  for (const testCase of CASES) {
    const start = Date.now();
    try {
      const result = await scrape(testCase);
      const ms = Date.now() - start;
      const issues = pass(testCase, result);
      const ok = issues.length === 0;

      if (ok) passed++;
      else failed++;

      rows.push({
        ok,
        name: testCase.name,
        ms,
        enricher: result.enricher_id,
        title: (result.title ?? "").slice(0, 48),
        image: result.image ? "✓" : "·",
        actions: result.actions.map((a) => a.label).join(" | "),
        issues: issues.join("; "),
      });
    } catch (error) {
      failed++;
      rows.push({
        ok: false,
        name: testCase.name,
        ms: Date.now() - start,
        enricher: "ERR",
        title: "",
        image: "·",
        actions: "",
        issues: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const row of rows) {
    const mark = row.ok ? "✅" : "❌";
    console.log(`${mark} ${row.name} (${row.ms}ms)`);
    console.log(`   enricher: ${row.enricher}  image: ${row.image}`);
    console.log(`   title: ${row.title || "(none)"}`);
    console.log(`   actions: ${row.actions || "(none)"}`);
    if (row.issues) console.log(`   ⚠ ${row.issues}`);
    console.log("");
  }

  console.log("─".repeat(72));
  console.log(`Result: ${passed}/${CASES.length} passed, ${failed} failed\n`);

  console.log("Browser quick links:");
  console.log(`  Demo hub:  ${BASE}/demo`);
  console.log(`  Now YT:    ${BASE}/now?url=${encodeURIComponent("https://www.youtube.com/watch?v=yfHasxI_s2A")}`);
  console.log(`  Now Map:   ${BASE}/now?url=${encodeURIComponent("https://map.naver.com/p/search/강릉")}`);
  console.log(`  Now PR:    ${BASE}/now?url=${encodeURIComponent("https://github.com/vercel/next.js/pull/12345")}`);
  console.log(`  Share sim: ${BASE}/share?url=${encodeURIComponent("https://yo-go.co.kr/")}`);
  console.log("");

  process.exit(failed > 0 ? 1 : 0);
}

main();
