import { normalizeEnricherContext } from "@/lib/enrichers/context";
import { commerceEnricher, isCommerceDomain } from "@/lib/enrichers/commerce";
import { deliveryEnricher, isDeliveryUrl } from "@/lib/enrichers/delivery";
import { genericEnricher } from "@/lib/enrichers/generic";
import { githubEnricher, isGitHubDomain } from "@/lib/enrichers/github";
import { isKakaoOpenChatUrl, kakaoEnricher } from "@/lib/enrichers/kakao";
import { addressEnricher, isAddressUrl } from "@/lib/enrichers/address";
import { mapEnricher, isMapUrl } from "@/lib/enrichers/map";
import { isNaverContentUrl, naverEnricher } from "@/lib/enrichers/naver";
import { isOttUrl, ottEnricher } from "@/lib/enrichers/ott";
import { isTicketUrl, ticketEnricher } from "@/lib/enrichers/ticket";
import { isTransportUrl, transportEnricher } from "@/lib/enrichers/transport";
import { isPortalHomeUrl, tryEnrichPortal } from "@/lib/enrichers/portal-enricher";
import { isYouTubeDomain, youtubeEnricher } from "@/lib/enrichers/youtube";
import { fetchAnalyticsClickStats } from "@/lib/analytics/server-stats";
import { rankActionsByIntent } from "@/lib/intent/rank-actions";
import { fetchBinStats } from "@/lib/intent/store";
import { resolveActions } from "@/lib/resolvers";
import { applyRoutingToActions } from "@/lib/routing/apply-routing";
import { routeLink } from "@/lib/routing/intelligent-router";
import type {
  EnrichedLink,
  Enricher,
  EnricherContext,
} from "@/lib/enrichers/types";
import { tryCreateClient } from "@/lib/supabase/server";

const DOMAIN_ENRICHERS: Enricher[] = [
  youtubeEnricher,
  githubEnricher,
  mapEnricher,
  addressEnricher,
  transportEnricher,
  deliveryEnricher,
  kakaoEnricher,
  ottEnricher,
  ticketEnricher,
  naverEnricher,
  commerceEnricher,
];

const PIN_TOP_ENRICHERS = new Set([
  "portal-v1",
  youtubeEnricher.id,
  githubEnricher.id,
  mapEnricher.id,
  addressEnricher.id,
  transportEnricher.id,
  deliveryEnricher.id,
  kakaoEnricher.id,
  ottEnricher.id,
  ticketEnricher.id,
  naverEnricher.id,
  commerceEnricher.id,
]);

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function matchesEnricher(enricher: Enricher, domain: string, rawUrl: string) {
  if (enricher.id === youtubeEnricher.id) {
    return isYouTubeDomain(domain);
  }

  if (enricher.id === githubEnricher.id) {
    return isGitHubDomain(domain);
  }

  if (enricher.id === mapEnricher.id) {
    return isMapUrl(rawUrl);
  }

  if (enricher.id === addressEnricher.id) {
    return isAddressUrl(rawUrl);
  }

  if (enricher.id === transportEnricher.id) {
    return isTransportUrl(rawUrl);
  }

  if (enricher.id === deliveryEnricher.id) {
    return isDeliveryUrl(rawUrl);
  }

  if (enricher.id === kakaoEnricher.id) {
    return isKakaoOpenChatUrl(rawUrl);
  }

  if (enricher.id === ottEnricher.id) {
    return isOttUrl(rawUrl);
  }

  if (enricher.id === ticketEnricher.id) {
    return isTicketUrl(rawUrl);
  }

  if (enricher.id === naverEnricher.id) {
    return isNaverContentUrl(rawUrl);
  }

  if (enricher.id === commerceEnricher.id) {
    return isCommerceDomain(domain);
  }

  return enricher.domains?.some(
    (candidate) => normalizeDomain(candidate) === normalizeDomain(domain)
  );
}

export function resolveEnricher(
  domain: string,
  rawUrl: string,
  _context?: EnricherContext
): Enricher {
  for (const enricher of DOMAIN_ENRICHERS) {
    if (matchesEnricher(enricher, domain, rawUrl)) {
      return enricher;
    }
  }

  return genericEnricher;
}

async function applyIntentRank(
  enriched: EnrichedLink,
  context: EnricherContext
): Promise<EnrichedLink> {
  const supabase = await tryCreateClient();
  const [stats, analyticsStats] = supabase
    ? await Promise.all([
        fetchBinStats(supabase, context),
        fetchAnalyticsClickStats(supabase),
      ])
    : [[], null];

  const actions = rankActionsByIntent(
    enriched.actions,
    context,
    stats,
    enriched.url,
    { pinTopAction: PIN_TOP_ENRICHERS.has(enriched.enricher_id) },
    analyticsStats
  );

  return { ...enriched, actions };
}

async function finalizeEnriched(
  enriched: EnrichedLink,
  context: EnricherContext
): Promise<EnrichedLink> {
  const routing = routeLink({
    url: enriched.url,
    domain: enriched.domain,
    title: enriched.title,
    description: enriched.description,
    source_type: enriched.source_type,
  });
  const routedContext = { ...context, routing };

  const resolved: EnrichedLink = {
    ...enriched,
    routing,
    actions: resolveActions(enriched.actions, routedContext, enriched.url, {
      title: enriched.title,
      description: enriched.description,
    }),
  };

  resolved.actions = applyRoutingToActions(
    resolved.actions,
    {
      sourceUrl: enriched.url,
      domain: enriched.domain,
      title: enriched.title,
      description: enriched.description,
    },
    routing
  );

  return applyIntentRank(resolved, context);
}

export async function enrichUrl(
  rawUrl: string,
  context?: Partial<EnricherContext> | null
): Promise<EnrichedLink> {
  const normalizedContext = normalizeEnricherContext(context);
  let domain = "link";
  let parsedUrl = rawUrl;

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
    );
    domain = parsed.hostname;
    parsedUrl = parsed.href;
  } catch {
    const enriched = await genericEnricher.enrich(rawUrl, normalizedContext);
    return finalizeEnriched(enriched, normalizedContext);
  }

  if (isPortalHomeUrl(parsedUrl)) {
    const portalPromise = tryEnrichPortal(parsedUrl, normalizedContext);
    if (portalPromise) {
      const enriched = await portalPromise;
      return finalizeEnriched(enriched, normalizedContext);
    }
  }

  const enricher = resolveEnricher(domain, parsedUrl, normalizedContext);
  const enriched = await enricher.enrich(parsedUrl, normalizedContext);
  return finalizeEnriched(enriched, normalizedContext);
}

export {
  genericEnricher,
  youtubeEnricher,
  githubEnricher,
  mapEnricher,
  addressEnricher,
  transportEnricher,
  deliveryEnricher,
  kakaoEnricher,
  ottEnricher,
  ticketEnricher,
  naverEnricher,
  commerceEnricher,
};
