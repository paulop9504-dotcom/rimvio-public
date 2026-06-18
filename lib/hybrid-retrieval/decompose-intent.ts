import {
  buildProductDecisionContext,
  detectEmotionalState,
  detectProductUrgency,
  parseProductShoppingIntent,
} from "@/lib/product-injector/parse-shopping-intent";
import type { DecomposedIntent, HybridRetrievalContext } from "@/lib/hybrid-retrieval/types";

function inferSubIntent(intent: string, query: string, emotional_state: string): string {
  if (intent === "price_compare") {
    return "compare_price";
  }
  if (intent === "recommend") {
    return emotional_state === "boredom" ? "explore_options" : "curated_pick";
  }
  if (intent === "purchase") {
    return emotional_state === "urgency" ? "instant_buy" : "buy_now";
  }
  if (/(?:배달|음식|치킨|맛집)/u.test(query)) {
    return "food_order";
  }
  if (/(?:병원|예약|진료)/u.test(query)) {
    return "book_service";
  }
  if (/(?:송금|이체|결제)/u.test(query)) {
    return "finance_execute";
  }
  return "actionable_lookup";
}

/** Step 1 — intent decomposition from user query + context. */
export function decomposeHybridIntent(
  user_query: string,
  context?: HybridRetrievalContext,
): DecomposedIntent | null {
  const trimmed = user_query.trim();
  if (trimmed.length < 2) {
    return null;
  }

  const parsed = parseProductShoppingIntent(trimmed);
  const decisionContext = buildProductDecisionContext(trimmed, parsed?.user_intent);
  const emotional_state = context?.emotional_state ?? detectEmotionalState(trimmed);
  const urgency = context?.urgency ?? detectProductUrgency(trimmed);

  const intent = parsed?.user_intent ?? inferGeneralIntent(trimmed);
  const query = parsed?.query ?? extractFallbackQuery(trimmed);

  if (!query || query.length < 2) {
    return null;
  }

  if (!parsed && !isActionableQuery(trimmed, intent)) {
    return null;
  }

  return {
    intent,
    sub_intent: inferSubIntent(intent, query, emotional_state),
    urgency,
    query,
    emotional_state,
  };
}

function inferGeneralIntent(message: string): string {
  if (/(?:배달|주문|사고\s*싶|구매|살\s*까)/u.test(message)) {
    return "purchase";
  }
  if (/(?:추천|찾아|어디)/u.test(message)) {
    return "recommend";
  }
  if (/(?:가격|비교|얼마)/u.test(message)) {
    return "price_compare";
  }
  if (/(?:예약|송금|이체)/u.test(message)) {
    return "service";
  }
  return "recommend";
}

function extractFallbackQuery(message: string): string {
  return message
    .replace(/(?:추천|사고\s*싶|구매|찾아\s*줘|좀|요|줘|해\s*줘|지금|당장|빨리)/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isActionableQuery(message: string, intent: string): boolean {
  if (intent === "service") {
    return true;
  }
  return /(?:사|구매|추천|주문|배달|쇼핑|이어폰|노트북|아이패드|아이폰|갤럭시|치킨|맛집|예약|송금)/u.test(
    message,
  );
}
