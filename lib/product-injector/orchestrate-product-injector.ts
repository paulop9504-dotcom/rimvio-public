import { applyDisclosureToOrchestratorResult } from "@/lib/action-chat/action-confidence";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { validateLinkAction } from "@/lib/actions/action-validator";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { injectProducts } from "@/lib/product-injector/inject-products";
import {
  buildProductDecisionContext,
  parseProductShoppingIntent,
} from "@/lib/product-injector/parse-shopping-intent";
import type { EmotionalRecommendedProduct } from "@/lib/product-injector/types";

function actionLabel(product: EmotionalRecommendedProduct): string {
  if (product.action === "BUY") {
    return `${product.name} · ${product.price}`;
  }
  if (product.action === "BOOK") {
    return `${product.name} 예약`;
  }
  return product.name;
}

function buildSummary(
  emotion: string,
  products: EmotionalRecommendedProduct[],
): string {
  const primary = products[0];
  if (!primary) {
    return "추천 상품";
  }

  switch (emotion) {
    case "urgency":
      return `${primary.name} · ${primary.action === "BUY" ? "바로 구매" : "바로 보기"}`;
    case "fatigue":
    case "stress":
      return primary.name;
    case "boredom":
      return products.length > 1 ? `${primary.name} 외 ${products.length - 1}개` : primary.name;
    default:
      return `${primary.name} · ${primary.price}`.trim();
  }
}

export async function orchestrateProductInjector(input: {
  message: string;
}): Promise<OrchestratorResult | null> {
  const parsed = parseProductShoppingIntent(input.message);
  if (!parsed) {
    return null;
  }

  const context = buildProductDecisionContext(input.message, parsed.user_intent);

  const result = await injectProducts({
    user_intent: parsed.user_intent,
    query: parsed.query,
    context,
  });

  const routing = result.emotional_routing;
  const productsForActions = result.emotional_products ?? [];
  if (!routing || productsForActions.length === 0) {
    return null;
  }

  const actions = productsForActions
    .map((product) => {
      const open = createOpenAction({
        label: actionLabel(product),
        href: product.source_url,
        icon: "link",
        copyText: product.source_url,
        payload: {
          productInjector: true,
          emotionalRouting: true,
          emotion: routing.emotion,
          strategy: routing.strategy,
          action: product.action,
          confidence: product.confidence,
          reason: product.reason,
        },
      });
      return validateLinkAction(open);
    })
    .filter((action): action is NonNullable<typeof action> => action !== null);

  if (actions.length === 0) {
    return null;
  }

  const confidence = productsForActions[0]?.confidence ?? 0.75;

  return applyDisclosureToOrchestratorResult(
    {
      summary: buildSummary(routing.emotion, productsForActions),
      actions,
      source: "rules",
      confidence,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      actionsRevealed: true,
      pendingConfirm: false,
      thought: `emotional_routing:${routing.emotion}:${routing.strategy}`,
    },
    confidence,
  );
}
