import { buildCompareQuery } from "@/lib/commerce/compare-query";
import type { AppLocale } from "@/lib/i18n/types";
import { detectProductLane } from "@/lib/markets/detect-lane";
import { resolveMarket } from "@/lib/markets/detect-market";
import { destinationById } from "@/lib/markets/destinations";
import { laneDestinationIds, MARKET_PRIMARY_LABEL } from "@/lib/markets/packs";
import { shouldOfferMarketCompare } from "@/lib/markets/travel-intent";
import type {
  CompareDestination,
  CompareDestinationId,
  CompareDestinationPlan,
} from "@/lib/markets/types";

function destinationMatchesCurrentSite(
  destination: CompareDestination,
  domain: string,
  sourceUrl: string
) {
  const haystack = `${domain} ${sourceUrl}`.toLowerCase();
  return destination.domainPattern.test(haystack);
}

function compareQueryFrom(input: {
  title: string | null | undefined;
  domain: string;
  query?: string | null;
}) {
  if (input.query?.trim()) {
    return input.query.trim();
  }

  return (
    buildCompareQuery(input.title, input.domain) ??
    input.title?.trim() ??
    input.domain.replace(/^www\./, "")
  );
}

export function resolveCompareDestinations(input: {
  title: string | null | undefined;
  domain: string;
  sourceUrl: string;
  locale?: AppLocale | null;
  query?: string | null;
  limit?: number;
  category?: string | null;
  source_type?: string | null;
  /** Skip destinations that trigger aggressive bot blocks during lab testing. */
  excludeDestinationIds?: CompareDestinationId[];
}): CompareDestinationPlan | null {
  if (
    !shouldOfferMarketCompare({
      title: input.title,
      domain: input.domain,
      sourceUrl: input.sourceUrl,
      category: input.category,
      source_type: input.source_type,
    })
  ) {
    return null;
  }

  const query = compareQueryFrom(input);
  if (!query) {
    return null;
  }

  const market = resolveMarket({
    url: input.sourceUrl,
    domain: input.domain,
    locale: input.locale,
  });
  const lane = detectProductLane({
    title: input.title,
    domain: input.domain,
    sourceUrl: input.sourceUrl,
  });

  const excluded = new Set(input.excludeDestinationIds ?? []);
  const rankedIds = laneDestinationIds(market, lane);
  const destinations = rankedIds
    .map((id) => destinationById(id))
    .filter(
      (destination) =>
        !excluded.has(destination.id) &&
        !destinationMatchesCurrentSite(destination, input.domain, input.sourceUrl)
    );

  if (destinations.length === 0) {
    return null;
  }

  const limit = input.limit ?? 3;

  return {
    market,
    lane,
    query,
    primaryLabel: MARKET_PRIMARY_LABEL[market],
    destinations: destinations.slice(0, limit),
  };
}
