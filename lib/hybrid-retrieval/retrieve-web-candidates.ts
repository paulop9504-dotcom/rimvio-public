import { resolveKoreanServiceDeeplink } from "@/lib/korean-service-router/resolve-korean-service-deeplink";
import { fetchWebProductCandidates } from "@/lib/product-injector/fetch-web-product-candidates";
import { hasModelName, hasPriceOrSpec, extractSpecHint } from "@/lib/product-injector/has-model-name";
import { isProductPageUrl } from "@/lib/product-injector/is-product-page-url";
import type {
  DecomposedIntent,
  HybridCandidate,
  HybridRetrievalContext,
} from "@/lib/hybrid-retrieval/types";

function formatPrice(value: number | null): string | undefined {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

/** Step 2 — factual web candidates only (products + actionable services). */
export async function retrieveHybridCandidates(input: {
  decomposed: DecomposedIntent;
  user_query: string;
  context?: HybridRetrievalContext;
}): Promise<HybridCandidate[]> {
  const candidates: HybridCandidate[] = [];
  const seenUrls = new Set<string>();

  const rawProducts = await fetchWebProductCandidates(input.decomposed.query);
  for (const [index, raw] of rawProducts.entries()) {
    if (!isProductPageUrl(raw.source_url)) {
      continue;
    }
    if (!hasModelName(raw.name)) {
      continue;
    }
    if (!hasPriceOrSpec(raw.name, raw.price, raw.specHint ?? extractSpecHint(raw.name))) {
      continue;
    }
    if (input.context?.budget && raw.price && raw.price > input.context.budget) {
      continue;
    }

    const url = raw.source_url.trim();
    if (seenUrls.has(url)) {
      continue;
    }
    seenUrls.add(url);

    candidates.push({
      id: `product-${index}`,
      name: raw.name.trim(),
      url,
      kind: "product",
      price: formatPrice(raw.price),
      evidence: `web:${raw.source}`,
    });
  }

  const service = resolveKoreanServiceDeeplink(input.user_query);
  if (service && !seenUrls.has(service.deeplink)) {
    seenUrls.add(service.deeplink);
    candidates.push({
      id: "service-0",
      name: service.serviceName,
      url: service.deeplink,
      kind: "service",
      evidence: `service:${service.serviceId}`,
    });
  }

  return candidates.slice(0, 12);
}
