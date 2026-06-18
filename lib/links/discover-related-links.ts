import { createHash } from "node:crypto";
import { resolveCategory } from "@/lib/categories/resolve-category";
import {
  crawlAnchorLinksFromPage,
  pickDiverseAnchorLinks,
} from "@/lib/enrichers/crawl-page-links";
import { enrichUrl } from "@/lib/enrichers/registry";
import { isWeakTitleHint } from "@/lib/enrichers/url-intelligence";
import {
  type MainLinkContext,
  RELEVANCE_MIN_SCORE,
  scoreLinkRelevance,
} from "@/lib/links/link-relevance";

export type RelatedLinkPreview = {
  id: string;
  original_url: string;
  title: string;
  domain: string;
  thumbnail_url: string | null;
  category: string | null;
  relevance: number;
};

const MAX_CRAWL = 48;
const MAX_ENRICH = 14;
const MAX_RESULTS = 6;
const ENRICH_BATCH = 4;

function previewId(url: string) {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function isUsefulCandidate(title: string | null) {
  if (!title?.trim() || isWeakTitleHint(title)) {
    return false;
  }

  return !/^(네이버|naver|home|홈|more|더보기|login|로그인)$/i.test(title.trim());
}

async function enrichBatch(urls: string[]) {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        return await enrichUrl(url);
      } catch {
        return null;
      }
    })
  );

  return results.filter(Boolean);
}

async function resolveMainContext(
  seedUrl: string,
  hint?: Partial<MainLinkContext>
): Promise<MainLinkContext> {
  if (hint?.title?.trim() && hint.domain?.trim()) {
    return {
      url: seedUrl,
      title: hint.title.trim(),
      domain: hint.domain.trim(),
      category: hint.category ?? null,
      source_type: hint.source_type ?? null,
    };
  }

  const enriched = await enrichUrl(seedUrl);
  return {
    url: seedUrl,
    title: enriched.title?.trim() || seedUrl,
    domain: enriched.domain,
    category: resolveCategory(enriched),
    source_type: enriched.source_type,
  };
}

export async function discoverRelatedLinks(
  seedUrl: string,
  hint?: Partial<MainLinkContext>
): Promise<RelatedLinkPreview[]> {
  const main = await resolveMainContext(seedUrl, hint);

  const crawled = await crawlAnchorLinksFromPage(main.url, {
    maxLinks: MAX_CRAWL,
    includeSubdomains: true,
  });

  if (crawled.length === 0) {
    return [];
  }

  const candidates = pickDiverseAnchorLinks(crawled, MAX_ENRICH + 4, 3);
  const anchorByUrl = new Map(
    candidates.map((entry) => [entry.url.replace(/\/$/, ""), entry.anchorText])
  );

  const toEnrich = candidates.map((entry) => entry.url).slice(0, MAX_ENRICH);
  const enrichedItems: RelatedLinkPreview[] = [];

  for (let index = 0; index < toEnrich.length; index += ENRICH_BATCH) {
    const batch = toEnrich.slice(index, index + ENRICH_BATCH);
    const enriched = await enrichBatch(batch);

    for (const item of enriched) {
      if (!item?.url || !isUsefulCandidate(item.title)) {
        continue;
      }

      const normalizedUrl = item.url.replace(/\/$/, "");
      const relevance = scoreLinkRelevance(main, {
        url: item.url,
        title: item.title,
        domain: item.domain,
        anchorText: anchorByUrl.get(normalizedUrl) ?? null,
        category: resolveCategory(item),
        source_type: item.source_type,
      });

      if (relevance < RELEVANCE_MIN_SCORE) {
        continue;
      }

      enrichedItems.push({
        id: previewId(item.url),
        original_url: item.url,
        title: item.title?.trim() || item.domain,
        domain: item.domain,
        thumbnail_url: item.image ?? null,
        category: resolveCategory(item),
        relevance,
      });
    }
  }

  return enrichedItems
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, MAX_RESULTS);
}
