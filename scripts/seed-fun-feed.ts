#!/usr/bin/env npx tsx
/**
 * Build lib/demo/fun-feed-links.json from enrichers (no dev server).
 * Usage: npm run seed:fun
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCategory } from "../lib/categories/resolve-category";
import { enrichUrl } from "../lib/enrichers/registry";
import { buildVisualFieldsFromEnriched } from "../lib/feed/feed-visual";
import type { LinkRow } from "../types/database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../lib/demo/fun-feed-links.json");

const FUN_LINKS = [
  { id: "fun-google-portal", label: "🌐 Google 홈", url: "https://www.google.com/" },
  { id: "fun-naver-portal", label: "🌐 네이버 홈", url: "https://www.naver.com/" },
  { id: "fun-youtube-portal", label: "🌐 YouTube 홈", url: "https://www.youtube.com/" },
  { id: "fun-coupang-portal", label: "🌐 쿠팡 홈", url: "https://www.coupang.com/" },
  { id: "fun-rickroll", label: "🎵 Rick Roll", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  {
    id: "fun-eiffel",
    label: "🗼 에펠탑 지도",
    url: "https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945",
  },
  {
    id: "fun-jeju-airbnb",
    label: "🏝 제주 에어비앤비",
    url: "https://www.airbnb.com/s/Jeju-Island--South-Korea/homes",
  },
  { id: "fun-nyan", label: "📚 Nyan Cat 위키", url: "https://en.wikipedia.org/wiki/Nyan_Cat" },
  { id: "fun-netflix", label: "🎬 Netflix", url: "https://www.netflix.com/browse" },
  { id: "fun-tving", label: "📺 TVING", url: "https://www.tving.com/" },
  { id: "fun-musinsa", label: "🛍 무신사 랭킹", url: "https://www.musinsa.com/ranking/" },
  {
    id: "fun-gangnam-map",
    label: "🚕 강남역 카카오맵",
    url: "https://map.kakao.com/?q=%EA%B0%95%EB%82%A8%EC%97%AD",
  },
  { id: "fun-baemin", label: "🍗 배민", url: "https://www.baemin.com/" },
  { id: "fun-interpark", label: "🎫 인터파크 티켓", url: "https://ticket.interpark.com/" },
  { id: "fun-kakao-chat", label: "💬 카카오 오픈채팅", url: "https://open.kakao.com/o/gsXxUJui" },
  { id: "fun-octocat", label: "🐙 GitHub Octocat", url: "https://github.com/octocat/Hello-World" },
  { id: "fun-figma", label: "🎨 Figma Community", url: "https://www.figma.com/community" },
  { id: "fun-trip", label: "✈️ Trip 항공권", url: "https://kr.trip.com/flights/" },
];

const CONTEXT = {
  hour: 19,
  installedApps: ["kakaomap", "youtube"],
  locationCategory: "home" as const,
  categoryWeights: {
    media: 0.35,
    travel: 0.25,
    shopping: 0.2,
    social: 0.1,
    research: 0.05,
    uncategorized: 0.05,
  },
};

const hour = 60 * 60 * 1000;
const day = 24 * hour;

function toLinkRow(
  item: (typeof FUN_LINKS)[number],
  enriched: Awaited<ReturnType<typeof enrichUrl>>,
  index: number
): LinkRow {
  const visual = buildVisualFieldsFromEnriched(enriched);

  return {
    id: item.id,
    user_id: null,
    original_url: enriched.url,
    title: enriched.title,
    thumbnail_url: enriched.image,
    domain: enriched.domain,
    category: resolveCategory(enriched),
    actions: enriched.actions,
    visual_mode: visual.visual_mode,
    source_type: visual.source_type,
    created_at: new Date(Date.now() - index * hour).toISOString(),
    expires_at: new Date(Date.now() + 7 * day).toISOString(),
  };
}

async function main() {
  console.log("\n🌱 Building fun feed JSON (direct enrichers)\n");

  const rows: LinkRow[] = [];

  for (let index = 0; index < FUN_LINKS.length; index += 1) {
    const item = FUN_LINKS[index];
    process.stdout.write(`  ${item.label} … `);

    try {
      const enriched = await enrichUrl(item.url, CONTEXT);
      rows.push(toLinkRow(item, enriched, index));
      console.log(`✓ ${enriched.enricher_id}`);
    } catch (error) {
      console.log("✗");
      console.error(`    ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    }
  }

  fs.writeFileSync(OUT, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${rows.length} links → ${OUT}\n`);
}

void main();
