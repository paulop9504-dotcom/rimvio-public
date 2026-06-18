import { buildLinkRankingContextKey } from "@/lib/feed/build-link-ranking-context-key";
import type { LinkActionItem, LinkRow } from "@/types/database";

function hasMarketPack(action: Pick<LinkActionItem, "payload">): boolean {
  const pack = action.payload?.marketPack;
  return (
    typeof pack === "object" &&
    pack != null &&
    typeof (pack as { market?: unknown }).market === "string"
  );
}

/** Rollup context key — compare actions get a distinct commerce slice. */
export function buildCommerceAwareRankingContextKey(input: {
  link: Pick<LinkRow, "domain" | "category" | "source_type">;
  action?: Pick<LinkActionItem, "id" | "label" | "payload"> | null;
}): string {
  const base = buildLinkRankingContextKey({
    domain: input.link.domain,
    category: input.link.category,
  });

  const isCommerce =
    input.link.category === "shopping" ||
    input.link.source_type === "commerce" ||
    /compare|비교|가격/iu.test(input.action?.label ?? "");

  if (!isCommerce) {
    return base;
  }

  if (input.action && hasMarketPack(input.action)) {
    const market = (input.action.payload!.marketPack as { market: string }).market;
    return `${base}::compare::${market}`;
  }

  if (input.action && /compare|비교|가격/iu.test(input.action.label)) {
    return `${base}::compare`;
  }

  return base;
}
