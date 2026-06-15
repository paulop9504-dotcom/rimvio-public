#!/usr/bin/env npx tsx
/**
 * Crawl seed pages, pick random links, enrich, merge into fun-feed-links.json.
 * Usage: npm run seed:crawl
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCategory } from "../lib/categories/resolve-category";
import {
  crawlLinksFromPage,
  pickDiverseLinks,
} from "../lib/enrichers/crawl-page-links";
import { enrichUrl } from "../lib/enrichers/registry";
import { buildVisualFieldsFromEnriched } from "../lib/feed/feed-visual";
import { isWeakTitleHint } from "../lib/enrichers/url-intelligence";
import type { LinkRow } from "../types/database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../lib/demo/fun-feed-links.json");

const CRAWL_SEEDS = [
  "https://www.naver.com/",
  "https://news.naver.com/",
  "https://www.daum.net/",
  "https://www.yna.co.kr/",
  "https://www.hankyung.com/",
  "https://www.reddit.com/r/korea/hot/",
  "https://news.ycombinator.com/",
  "https://github.com/trending",
  "https://www.producthunt.com/",
  "https://www.musinsa.com/ranking/",
  "https://www.coupang.com/np/categories",
  "https://www.instagram.com/explore/",
  "https://www.youtube.com/feed/trending",
];

const CONTEXT = {
  hour: 19,
  installedApps: ["kakaomap", "youtube", "naver"],
  locationCategory: "home" as const,
  categoryWeights: {
    media: 0.3,
    travel: 0.15,
    shopping: 0.25,
    social: 0.15,
    research: 0.1,
    uncategorized: 0.05,
  },
};

const TARGET_NEW = Number(process.env.CRAWL_COUNT ?? 14);
const MAX_PER_SEED = 30;
const ENRICH_ATTEMPTS = Number(process.env.CRAWL_ATTEMPTS ?? 28);

function isUsefulEnriched(url: string, enriched: Awaited<ReturnType<typeof enrichUrl>>) {
  if (enriched.enricher_id === "github-v1" && /github\.com\/trending/i.test(url)) {
    return false;
  }

  if (isWeakTitleHint(enriched.title)) {
    return false;
  }

  if (
    /^(vote|section|tvHome|Profile|Ask|Build software better, together|한경 게임|네이버|사회)$/i.test(
      enriched.title.trim()
    ) ||
    /^(New Comments|Submissions from)/i.test(enriched.title.trim())
  ) {
    return false;
  }

  return true;
}

function slugFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const tail = parsed.pathname.split("/").filter(Boolean).slice(-2).join("-");
    const host = parsed.hostname.replace(/^www\./, "").split(".")[0];
    const base = tail || host;
    return base.replace(/[^a-zA-Z0-9가-힣_-]+/g, "-").slice(0, 48) || "link";
  } catch {
    return "link";
  }
}

function toLinkRow(
  url: string,
  enriched: Awaited<ReturnType<typeof enrichUrl>>,
  index: number
): LinkRow {
  const visual = buildVisualFieldsFromEnriched(enriched);
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  return {
    id: `crawl-${slugFromUrl(url)}-${index}`,
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

function readExistingRows(): LinkRow[] {
  if (!fs.existsSync(OUT)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(OUT, "utf8")) as LinkRow[];
}

async function main() {
  console.log(`\n🕸  Crawling ${CRAWL_SEEDS.length} seeds → ~${TARGET_NEW} random links\n`);

  const discovered: string[] = [];
  const existing = readExistingRows();
  const existingUrls = new Set(existing.map((row) => row.original_url));

  for (const seed of CRAWL_SEEDS) {
    process.stdout.write(`  ${seed} … `);

    try {
      const links = await crawlLinksFromPage(seed, { maxLinks: MAX_PER_SEED });
      const fresh = links.filter((href) => !existingUrls.has(href));
      discovered.push(...fresh);
      console.log(`${fresh.length} links`);
    } catch (error) {
      console.log("✗");
      console.error(`    ${error instanceof Error ? error.message : error}`);
    }
  }

  const unique = [...new Set(discovered)];
  const picked = pickDiverseLinks(unique, ENRICH_ATTEMPTS, 2);
  console.log(`\nPicked ${picked.length} diverse URLs from ${unique.length} discovered\n`);

  const crawledRows: LinkRow[] = [];

  for (let index = 0; index < picked.length; index += 1) {
    if (crawledRows.length >= TARGET_NEW) {
      break;
    }

    const url = picked[index];
    process.stdout.write(`  enrich ${url.slice(0, 72)}… `);

    try {
      const enriched = await enrichUrl(url, CONTEXT);
      if (!isUsefulEnriched(url, enriched)) {
        console.log("skip");
        continue;
      }

      crawledRows.push(toLinkRow(url, enriched, crawledRows.length));
      console.log(`✓ ${enriched.enricher_id} · ${enriched.title.slice(0, 40)}`);
    } catch (error) {
      console.log("✗");
      console.error(`    ${error instanceof Error ? error.message : error}`);
    }
  }

  const preserved = existing.filter((row) => !row.id.startsWith("crawl-"));
  const mergedByUrl = new Map<string, LinkRow>();

  for (const row of [...crawledRows, ...preserved]) {
    if (!mergedByUrl.has(row.original_url)) {
      mergedByUrl.set(row.original_url, row);
    }
  }

  const merged = [...mergedByUrl.values()].slice(0, 40);
  fs.writeFileSync(OUT, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

  console.log(
    `\nWrote ${merged.length} total links (${crawledRows.length} new crawled) → ${OUT}\n`
  );
}

void main();
