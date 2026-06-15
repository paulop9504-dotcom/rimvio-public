import type { MarketPriceSnapshot, MarketVerdict } from "@/lib/commerce/market-price";
import type { L0ValueMarketContext } from "@/lib/routing/l0-value-metric";

/** Adapt market snapshot for L0 orchestrator + value_metric. */
export function marketSnapshotToL0Context(
  snapshot: MarketPriceSnapshot | null | undefined
): L0ValueMarketContext | null {
  if (!snapshot?.listingPrice) {
    return null;
  }

  return {
    listingPrice: snapshot.listingPrice,
    medianPrice: snapshot.median,
    verdict: snapshot.verdict === "unknown" ? null : snapshot.verdict,
  };
}

export async function buildL0MarketContextForListing(input: {
  title: string;
  domain?: string | null;
  listingPriceText?: string | null;
}): Promise<L0ValueMarketContext | null> {
  const { buildMarketPriceSnapshot } = await import("@/lib/commerce/market-price");
  const snapshot = await buildMarketPriceSnapshot(input);
  return marketSnapshotToL0Context(snapshot);
}
