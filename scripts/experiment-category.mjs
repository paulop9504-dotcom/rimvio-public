#!/usr/bin/env node
/**
 * Blink category resolver experiment
 * Usage: node scripts/experiment-category.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

const CASES = [
  { name: "YouTube", url: "https://www.youtube.com/watch?v=yfHasxI_s2A", category: "media" },
  { name: "yo-go", url: "https://yo-go.co.kr/", category: "shopping" },
  { name: "Kakao chat", url: "https://open.kakao.com/o/gsXxUJui", category: "social" },
  { name: "Naver Map", url: "https://map.naver.com/p/search/강릉", category: "travel" },
  { name: "GitHub PR", url: "https://github.com/vercel/next.js/pull/12345", category: "research" },
  { name: "Figma (generic)", url: "https://www.figma.com/file/design-handoff", category: "research" },
  { name: "Yanolja", url: "https://www.yanolja.com/", category: "travel" },
  { name: "Coupang", url: "https://www.coupang.com/vp/products/123456", category: "shopping" },
  { name: "Unknown", url: "https://example.com/page", category: "uncategorized" },
];

const DEFAULT_CONTEXT = {
  hour: 8,
  installedApps: ["kakaomap"],
  locationCategory: "commute",
};

async function scrape(url) {
  const response = await fetch(`${BASE}/api/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, context: DEFAULT_CONTEXT }),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  console.log(`\n👀 Blink category experiment @ ${BASE}\n`);
  console.log("─".repeat(72));

  let passed = 0;
  let failed = 0;

  for (const testCase of CASES) {
    const start = Date.now();
    try {
      const result = await scrape(testCase.url);
      const got = result.linkCategory ?? result.category ?? "(missing)";
      const ok = got === testCase.category;

      if (ok) passed++;
      else failed++;

      console.log(`${ok ? "✅" : "❌"} ${testCase.name} (${Date.now() - start}ms)`);
      console.log(`   source: ${result.source_type} | enricher: ${result.enricher_id}`);
      console.log(`   category: ${got} ${ok ? "" : `(want ${testCase.category})`}`);
      console.log("");
    } catch (error) {
      failed++;
      console.log(`❌ ${testCase.name}`);
      console.log(`   ⚠ ${error instanceof Error ? error.message : String(error)}`);
      console.log("");
    }
  }

  console.log("─".repeat(72));
  console.log(`Result: ${passed}/${CASES.length} passed\n`);
  console.log("Browser:");
  console.log(`  Inbox filter: ${BASE}/inbox  (Demo 채우기 → pills 테스트)`);
  console.log(`  Demo seed:    ${BASE}/demo`);
  console.log("");

  process.exit(failed > 0 ? 1 : 0);
}

main();
