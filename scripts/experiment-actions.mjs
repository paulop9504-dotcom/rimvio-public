#!/usr/bin/env node
/**
 * Blink action experiment — copyText + deep-link actions
 * Usage: npm run experiment:actions [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

const CASES = [
  {
    name: "Map → Kakao T + copy",
    url: "https://map.naver.com/p/search/%EA%B0%95%EB%A6%89",
    context: { hour: 14, installedApps: [], locationCategory: "office" },
    expect: {
      enricher: "map-v1",
      actionIncludes: ["카카오T", "검색", "네이버지도"],
      copyTextIncludes: "강릉",
    },
  },
  {
    name: "Map commute → Kakao Map boost",
    url: "https://map.naver.com/p/search/%EA%B0%95%EB%A6%89",
    context: { hour: 8, installedApps: ["kakaomap"], locationCategory: "commute" },
    expect: {
      enricher: "map-v1",
      actionIncludes: ["카카오맵", "길찾기"],
      copyTextIncludes: "강릉",
    },
  },
  {
    name: "YouTube → app + title copy",
    url: "https://www.youtube.com/watch?v=yfHasxI_s2A",
    expect: {
      enricher: "youtube-v1",
      actionIncludes: ["재생", "YouTube 앱"],
      copyTextMinLen: 4,
    },
  },
  {
    name: "YouTube t= timestamp copy",
    url: "https://www.youtube.com/watch?v=yfHasxI_s2A&t=90s",
    expect: {
      enricher: "youtube-v1",
      actionIncludes: ["1:30"],
      copyTextIncludes: "1:30",
    },
  },
  {
    name: "Commerce → product copy",
    url: "https://yo-go.co.kr/",
    expect: {
      enricher: "commerce-v1",
      actionIncludes: ["타임딜", "복사"],
      copyTextMinLen: 2,
    },
  },
  {
    name: "Kakao chat → link copy",
    url: "https://open.kakao.com/o/gsXxUJui",
    expect: {
      enricher: "kakao-v1",
      actionIncludes: ["오픈채팅", "복사"],
      hasCopyOnly: true,
    },
  },
  {
    name: "GitHub PR → ref copy",
    url: "https://github.com/vercel/next.js/pull/12345",
    expect: {
      enricher: "github-v1",
      actionIncludes: ["PR"],
      copyTextIncludes: "vercel/next.js",
    },
  },
  {
    name: "Figma generic → domain action",
    url: "https://www.figma.com/file/design-handoff",
    expect: {
      enricher: "generic-v1",
      actionIncludes: ["Figma"],
    },
  },
  {
    name: "Coupang → app deep link + copy",
    url: "https://www.coupang.com/vp/products/123456",
    expect: {
      enricher: "commerce-v1",
      actionIncludes: ["쿠팡"],
      copyTextIncludes: "쿠팡 상품",
    },
  },
  {
    name: "Yanolja → stay + Kakao T",
    url: "https://www.yanolja.com/",
    expect: {
      enricher: "transport-v1",
      actionIncludes: ["숙소", "카카오T"],
    },
  },
  {
    name: "Korail → train booking",
    url: "https://www.letskorail.com/",
    expect: {
      enricher: "transport-v1",
      actionIncludes: ["기차", "카카오T"],
    },
  },
  {
    name: "Baemin → delivery app",
    url: "https://www.baemin.com/",
    expect: {
      enricher: "delivery-v1",
      actionIncludes: ["배민", "배민 앱"],
    },
  },
  {
    name: "Coupang Eats → not commerce",
    url: "https://www.coupang.com/eats/store/12345/gyochon-chicken",
    expect: {
      enricher: "delivery-v1",
      actionIncludes: ["쿠팡이츠"],
      copyTextIncludes: "gyochon",
    },
  },
  {
    name: "Klook → activity ticket",
    url: "https://www.klook.com/ko/activity/12345-universal/",
    expect: {
      enricher: "transport-v1",
      actionIncludes: ["액티비티", "Klook"],
    },
  },
  {
    name: "Trip.com → flight travel",
    url: "https://kr.trip.com/flights/",
    expect: {
      enricher: "transport-v1",
      actionIncludes: ["항공", "Trip"],
    },
  },
  {
    name: "Netflix → OTT app",
    url: "https://www.netflix.com/browse",
    expect: {
      enricher: "ott-v1",
      actionIncludes: ["Netflix", "Netflix 앱"],
    },
  },
  {
    name: "Melon ticket → ticket app",
    url: "https://ticket.melon.com/",
    expect: {
      enricher: "ticket-v1",
      actionIncludes: ["멜론", "멜론 앱"],
    },
  },
  {
    name: "Naver blog → naver app",
    url: "https://blog.naver.com/",
    expect: {
      enricher: "naver-v1",
      actionIncludes: ["블로그", "네이버"],
    },
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

  if (expect.hasCopyOnly) {
    const hasCopy = result.actions.some((action) => action.kind === "copy");
    if (!hasCopy) {
      issues.push("expected kind=copy action");
    }
  }

  return issues;
}

async function main() {
  console.log(`\n👀 Blink action experiment @ ${BASE}\n`);
  console.log("─".repeat(72));

  let passed = 0;
  let failed = 0;

  for (const testCase of CASES) {
    const start = Date.now();
    try {
      const result = await scrape(testCase);
      const issues = pass(testCase, result);
      const ok = issues.length === 0;
      if (ok) passed++;
      else failed++;

      console.log(`${ok ? "✅" : "❌"} ${testCase.name} (${Date.now() - start}ms)`);
      console.log(`   actions: ${result.actions.map((a) => a.label).join(" | ")}`);
      console.log(
        `   copy: ${readCopyTexts(result.actions).map((t) => `"${t}"`).join(", ") || "(none)"}`
      );
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
  console.log(`Result: ${passed}/${CASES.length} passed, ${failed} failed\n`);

  console.log("📱 모바일 실험 (같은 Wi‑Fi):");
  console.log(`   Demo:  ${BASE}/demo`);
  console.log(
    `   Map:   ${BASE}/now?url=${encodeURIComponent("https://map.naver.com/p/search/강릉")}`
  );
  console.log(
    `   YT:    ${BASE}/now?url=${encodeURIComponent("https://www.youtube.com/watch?v=yfHasxI_s2A&t=90s")}`
  );
  console.log(`   Feed:  ${BASE}/  (데모 채운 뒤 스와이프)`);
  console.log("");
  console.log("체크리스트:");
  console.log("  1. 🚕 카카오T 탭 → 토스트 \"강릉 복사됨\" → 카카오T 열림");
  console.log("  2. 카카오T 도착지 칸 → 붙여넣기");
  console.log("  3. ▶️ / 📱 YouTube 앱 → 제목 복사 확인");
  console.log("");

  process.exit(failed > 0 ? 1 : 0);
}

main();
