import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EnrichedLink } from "@/lib/enrichers/types";
import type { LinkRow } from "@/types/database";

const CACHE_DIR = path.join(process.cwd(), ".data", "cache", "scrape");
const DEFAULT_TTL_MS = 15 * 60 * 1000;

type ScrapeCacheResult = EnrichedLink & {
  link?: LinkRow;
  linkCategory?: string;
};

type CacheEntry = {
  storedAt: number;
  result: ScrapeCacheResult;
};

function cacheKey(rawUrl: string) {
  return createHash("sha256").update(rawUrl.trim().toLowerCase()).digest("hex");
}

async function ensureCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

export async function readScrapeCache(
  rawUrl: string,
  ttlMs = DEFAULT_TTL_MS
): Promise<ScrapeCacheResult | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${cacheKey(rawUrl)}.json`);
    const raw = await readFile(filePath, "utf8");
    const entry = JSON.parse(raw) as CacheEntry;

    if (!entry?.storedAt || !entry.result) {
      return null;
    }

    if (Date.now() - entry.storedAt > ttlMs) {
      return null;
    }

    return entry.result;
  } catch {
    return null;
  }
}

export async function writeScrapeCache(rawUrl: string, result: ScrapeCacheResult) {
  try {
    await ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${cacheKey(rawUrl)}.json`);
    const entry: CacheEntry = {
      storedAt: Date.now(),
      result,
    };
    await writeFile(filePath, JSON.stringify(entry), "utf8");
  } catch {
    // Cache is best-effort only.
  }
}
