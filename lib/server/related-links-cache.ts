import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RelatedLinkPreview } from "@/lib/links/discover-related-links";

const CACHE_DIR = path.join(process.cwd(), ".data", "cache", "related-links");
const DEFAULT_TTL_MS = 30 * 60 * 1000;

type CacheEntry = {
  storedAt: number;
  links: RelatedLinkPreview[];
};

function cacheKey(rawUrl: string) {
  return createHash("sha256").update(rawUrl.trim().toLowerCase()).digest("hex");
}

async function ensureCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

export async function readRelatedLinksCache(
  rawUrl: string,
  ttlMs = DEFAULT_TTL_MS
): Promise<RelatedLinkPreview[] | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${cacheKey(rawUrl)}.json`);
    const raw = await readFile(filePath, "utf8");
    const entry = JSON.parse(raw) as CacheEntry;

    if (!entry?.storedAt || !Array.isArray(entry.links)) {
      return null;
    }

    if (Date.now() - entry.storedAt > ttlMs) {
      return null;
    }

    return entry.links;
  } catch {
    return null;
  }
}

export async function writeRelatedLinksCache(
  rawUrl: string,
  links: RelatedLinkPreview[]
) {
  try {
    await ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${cacheKey(rawUrl)}.json`);
    const entry: CacheEntry = {
      storedAt: Date.now(),
      links,
    };
    await writeFile(filePath, JSON.stringify(entry), "utf8");
  } catch {
    // Cache is best-effort only.
  }
}
