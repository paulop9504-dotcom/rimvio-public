import { fetchWebProductCandidates } from "@/lib/product-injector/fetch-web-product-candidates";
import { rankProductCandidates } from "@/lib/product-injector/rank-product-candidates";
import {
  resolveEmotionalState,
  routeEmotionalProducts,
  routeEmotionalProductsPublic,
} from "@/lib/product-injector/route-emotional-products";
import { selectProductDecisionWire } from "@/lib/product-injector/select-product-decision";
import type { ProductInjectorInput, ProductInjectorOutput } from "@/lib/product-injector/types";

/** Real-time web product injection — emotion-routed, action-ready output. */
export async function injectProducts(
  input: ProductInjectorInput,
): Promise<ProductInjectorOutput> {
  const query = input.query.trim();
  const intent = input.user_intent.trim() || "product_search";

  if (!query) {
    return { intent, products: [] };
  }

  const raw = await fetchWebProductCandidates(query);
  const products = rankProductCandidates({
    query,
    raw,
    context: input.context,
  });

  const emotional_state = resolveEmotionalState(input.context);
  const routingWire = routeEmotionalProducts({
    user_intent: intent,
    emotional_state,
    context: input.context,
    candidate_products: products,
  });
  const emotional_routing = routeEmotionalProductsPublic({
    user_intent: intent,
    emotional_state,
    context: input.context,
    candidate_products: products,
  });

  const primary = routingWire.recommended_products[0];
  const selected = primary
    ? {
        name: primary.name,
        reason: primary.reason,
        confidence: primary.confidence,
        fallback_hidden: true as const,
        source_url: primary.source_url,
        price: primary.price,
      }
    : selectProductDecisionWire({
        intent,
        query,
        context: input.context,
        candidate_products: products,
      }) ?? undefined;

  return {
    intent,
    products,
    selected_product: selected,
    emotional_routing,
    emotional_products: routingWire.recommended_products,
  };
}

export function injectProductsJson(input: ProductInjectorInput): Promise<string> {
  return injectProducts(input).then((result) => JSON.stringify(result));
}
