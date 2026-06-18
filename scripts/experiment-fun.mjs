#!/usr/bin/env node
/**
 * Fun / eclectic link batch — portal + meme + travel + shopping mix
 * Usage: node scripts/experiment-fun.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

const FUN_CASES = [
  {
    name: "🌐 Portal — Google 홈",
    url: "https://www.google.com/",
    expect: { enricher: "portal-v1", actionIncludes: ["검색", "번역"] },
  },
  {
    name: "🌐 Portal — 네이버 홈",
    url: "https://www.naver.com/",
    expect: { enricher: "portal-v1", actionIncludes: ["뉴스", "지도"] },
  },
  {
    name: "🌐 Portal — YouTube 홈",
    url: "https://www.youtube.com/",
    expect: { enricher: "portal-v1", actionIncludes: ["Shorts", "구독"] },
  },
  {
    name: "🌐 Portal — 쿠팡 홈",
    url: "https://www.coupang.com/",
    expect: { enricher: "portal-v1", actionIncludes: ["쿠팡", "로켓"] },
  },
  {
    name: "🎵 Rick Roll (YouTube)",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    expect: { enricher: "youtube-v1", actionIncludes: ["재생"], copyTextMinLen: 4 },
  },
  {
    name: "🗼 에펠탑 지도",
    url: "https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945",
    expect: { enricher: "map-v1", actionIncludes: ["지도"] },
  },
  {
    name: "🏝 제주 에어비앤비",
    url: "https://www.airbnb.com/s/Jeju-Island--South-Korea/homes",
    expect: { enricher: "transport-v1", actionIncludes: ["숙소"] },
  },
  {
    name: "📚 Nyan Cat 위키",
    url: "https://en.wikipedia.org/wiki/Nyan_Cat",
    expect: { enricher: "generic-v1", copyTextIncludes: "Wikipedia" },
  },
  {
    name: "🎬 Netflix 홈",
    url: "https://www.netflix.com/browse",
    expect: { enricher: "ott-v1", actionIncludes: ["Netflix"] },
  },
  {
    name: "📺 TVING 홈",
    url: "https://www.tving.com/",
    expect: { enricher: "ott-v1", actionIncludes: ["TVING"] },
  },
  {
    name: "🛍 무신사 랭킹",
    url: "https://www.musinsa.com/ranking/",
    expect: { enricher: "commerce-v1", actionIncludes: ["무신사"] },
  },
  {
    name: "🚕 강남역 카카오맵",
    url: "https://map.kakao.com/?q=%EA%B0%95%EB%82%A8%EC%97%AD",
    expect: { enricher: "map-v1", actionIncludes: ["카카오맵"] },
  },
  {
    name: "🍗 교촌 치킨 배민",
    url: "https://www.baemin.com/",
    expect: { enricher: "delivery-v1", actionIncludes: ["배민"] },
  },
  {
    name: "🎫 인터파크 티켓",
    url: "https://ticket.interpark.com/",
    expect: { enricher: "ticket-v1", actionIncludes: ["인터파크"] },
  },
  {
    name: "💬 카카오 오픈채팅",
    url: "https://open.kakao.com/o/gsXxUJui",
    expect: { enricher: "kakao-v1", actionIncludes: ["오픈채팅"] },
  },
  {
    name: "🐙 GitHub Octocat repo",
    url: "https://github.com/octocat/Hello-World",
    expect: { enricher: "github-v1", actionIncludes: ["저장소"] },
  },
  {
    name: "🎨 Figma Community",
    url: "https://www.figma.com/community",
    expect: { enricher: "generic-v1", actionIncludes: ["Figma"] },
  },
  {
    name: "✈️ Trip 항공권",
    url: "https://kr.trip.com/flights/",
    expect: { enricher: "transport-v1", actionIncludes: ["항공"] },
  },
];

const DEFAULT_CONTEXT = {
  hour: 19,
  installedApps: ["kakaomap", "youtube"],
  locationCategory: "home",
  categoryWeights: {
    media: 0.35,
    travel: 0.25,
    shopping: 0.2,
    social: 0.1,
    research: 0.05,
    uncategorized: 0.05,
  },
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

function readCopyTexts(actions) {
  return actions
    .map((action) => action.payload?.copyText)
    .filter((value) => typeof value === "string" && value.trim());
}

function pass(testCase, result) {
  const issues = [];
  const { expect } = testCase;
  const labels = result.actions.map((a) => a.label).join(" ");
  const copyTexts = readCopyTexts(result.actions).join(" ");

  if (expect.enricher && result.enricher_id !== expect.enricher) {
    issues.push(`enricher: got ${result.enricher_id}, want ${expect.enricher}`);
  }

  for (const needle of expect.actionIncludes ?? []) {
    if (!labels.includes(needle)) {
      issues.push(`action missing "${needle}" in [${labels}]`);
    }
  }

  if (expect.copyTextIncludes && !copyTexts.includes(expect.copyTextIncludes)) {
    issues.push(`copyText missing "${expect.copyTextIncludes}" in [${copyTexts}]`);
  }

  if (expect.copyTextMinLen) {
    const longest = readCopyTexts(result.actions).sort((a, b) => b.length - a.length)[0];
    if (!longest || longest.length < expect.copyTextMinLen) {
      issues.push(`copyText too short: "${longest ?? ""}"`);
    }
  }

  return issues;
}

async function main() {
  console.log(`\n🎉 Blink FUN link experiment @ ${BASE}\n`);
  console.log("─".repeat(72));

  let passed = 0;
  let failed = 0;

  for (const testCase of FUN_CASES) {
    const start = Date.now();
    try {
      const result = await scrape(testCase);
      const issues = pass(testCase, result);
      const ok = issues.length === 0;
      if (ok) passed++;
      else failed++;

      console.log(`${ok ? "✅" : "❌"} ${testCase.name} (${Date.now() - start}ms)`);
      console.log(`   ${result.enricher_id} · ${result.source_type} · ${(result.title ?? "").slice(0, 56)}`);
      console.log(`   actions: ${result.actions.map((a) => a.label).join(" | ")}`);
      const copies = readCopyTexts(result.actions);
      if (copies.length) {
        console.log(`   copy: ${copies.map((t) => `"${t.slice(0, 40)}${t.length > 40 ? "…" : ""}"`).join(", ")}`);
      }
      if (issues.length) {
        console.log(`   ⚠ ${issues.join("; ")}`);
      }
      console.log("");
    } catch (error) {
      failed++;
      console.log(`❌ ${testCase.name}`);
      console.log(`   ⚠ ${error instanceof Error ? error.message : String(error)}`);
      console.log("");
    }
  }

  console.log("─".repeat(72));
  console.log(`Result: ${passed}/${FUN_CASES.length} passed, ${failed} failed\n`);

  console.log("📱 바로 열어보기:");
  for (const item of FUN_CASES.slice(0, 6)) {
    console.log(`   ${item.name}`);
    console.log(`   ${BASE}/now?url=${encodeURIComponent(item.url)}`);
  }
  console.log("");

  process.exit(failed > 0 ? 1 : 0);
}

main();
