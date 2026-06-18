import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSecondhandDomain } from "@/lib/commerce/commerce-cleaner";
import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";

const CACHE_DIR = path.join(process.cwd(), ".data", "cache", "market-price");
const SECONDHAND_TTL_MS = 6 * 60 * 60 * 1000;
const COMMERCE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = {
  storedAt: number;
  snapshot: MarketPriceSnapshot;
};

function normalizeCachePart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function marketPriceCacheKey(input: {
  query: string;
  domain?: string | null;
  listingPrice?: number | null;
}) {
  const payload = [
    normalizeCachePart(input.query),
    normalizeCachePart(input.domain ?? ""),
    input.listingPrice ? String(Math.round(input.listingPrice)) : "",
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}

export function marketPriceCacheTtlMs(domain?: string | null) {
  return isSecondhandDomain(domain ?? "") ? SECONDHAND_TTL_MS : COMMERCE_TTL_MS;
}

async function ensureCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

export async function readMarketPriceCache(
  key: string,
  ttlMs: number
): Promise<MarketPriceSnapshot | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    const raw = await readFile(filePath, "utf8");
    const entry = JSON.parse(raw) as CacheEntry;

    if (!entry?.storedAt || !entry.snapshot) {
      return null;
    }

    if (Date.now() - entry.storedAt > ttlMs) {
      return null;
    }

    return entry.snapshot;
  } catch {
    return null;
  }
}

export async function writeMarketPriceCache(
  key: string,
  snapshot: MarketPriceSnapshot
) {
  try {
    await ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    const entry: CacheEntry = {
      storedAt: Date.now(),
      snapshot,
    };
    await writeFile(filePath, JSON.stringify(entry), "utf8");
  } catch {
    // Cache is best-effort only.
  }
}

export function resetMarketPriceCacheForTests() {
  // File cache resets between test runs via unique keys; noop hook for future use.
}
