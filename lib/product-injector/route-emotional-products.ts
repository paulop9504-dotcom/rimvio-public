import { scorePurchaseDirectness } from "@/lib/product-injector/is-product-page-url";
import type {
  EmotionalRoutingInput,
  EmotionalRoutingOutput,
  EmotionalRoutingWire,
  EmotionalState,
  ProductActionType,
  ProductCandidate,
} from "@/lib/product-injector/types";

type EmotionStrategy = {
  strategy: string;
  maxProducts: number;
  minProducts: number;
  preferImmediate: boolean;
  allowCompare: boolean;
  primaryAction: ProductActionType;
  secondaryAction: ProductActionType;
};

const EMOTION_STRATEGIES: Record<EmotionalState, EmotionStrategy> = {
  fatigue: {
    strategy: "minimize_choice_immediate",
    maxProducts: 2,
    minProducts: 1,
    preferImmediate: true,
    allowCompare: false,
    primaryAction: "BUY",
    secondaryAction: "BUY",
  },
  stress: {
    strategy: "stable_instant_reward",
    maxProducts: 1,
    minProducts: 1,
    preferImmediate: true,
    allowCompare: false,
    primaryAction: "BUY",
    secondaryAction: "BUY",
  },
  urgency: {
    strategy: "fastest_single_action",
    maxProducts: 1,
    minProducts: 1,
    preferImmediate: true,
    allowCompare: false,
    primaryAction: "BUY",
    secondaryAction: "BUY",
  },
  boredom: {
    strategy: "explore_allowed",
    maxProducts: 3,
    minProducts: 1,
    preferImmediate: false,
    allowCompare: true,
    primaryAction: "VIEW",
    secondaryAction: "VIEW",
  },
  neutral: {
    strategy: "standard_recommend",
    maxProducts: 3,
    minProducts: 2,
    preferImmediate: false,
    allowCompare: true,
    primaryAction: "BUY",
    secondaryAction: "VIEW",
  },
};

const IMMEDIATE_REASON = /바로\s*구매|구매\s*가능|즉시/u;

function resolveAction(
  intent: string,
  emotion: EmotionalState,
  index: number,
  strategy: EmotionStrategy,
): ProductActionType {
  if (intent === "purchase" || emotion === "urgency" || emotion === "fatigue" || emotion === "stress") {
    return "BUY";
  }
  if (emotion === "boredom") {
    return index === 0 && intent === "recommend" ? "VIEW" : strategy.secondaryAction;
  }
  return index === 0 ? strategy.primaryAction : strategy.secondaryAction;
}

function buildEmotionReason(
  emotion: EmotionalState,
  product: ProductCandidate,
  action: ProductActionType,
): string {
  switch (emotion) {
    case "urgency":
      return action === "BUY" ? "바로 구매" : "빠르게 보기";
    case "fatigue":
      return "바로 해결";
    case "stress":
      return "안정적 선택";
    case "boredom":
      return product.reason || "탐색용 추천";
    default:
      return product.reason || "추천 상품";
  }
}

function scoreForEmotion(product: ProductCandidate, emotion: EmotionalState): number {
  const directness = scorePurchaseDirectness(product.source_url);
  const immediate = IMMEDIATE_REASON.test(product.reason) ? 0.15 : 0;

  switch (emotion) {
    case "urgency":
    case "fatigue":
    case "stress":
      return directness * 0.6 + product.confidence * 0.3 + immediate;
    case "boredom":
      return product.confidence * 0.55 + directness * 0.25 + immediate * 0.5;
    default:
      return product.confidence * 0.5 + directness * 0.35 + immediate;
  }
}

function rankForEmotion(
  candidates: ProductCandidate[],
  emotion: EmotionalState,
  preferImmediate: boolean,
): ProductCandidate[] {
  const ranked = [...candidates].sort((a, b) => {
    const scoreA = scoreForEmotion(a, emotion);
    const scoreB = scoreForEmotion(b, emotion);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    if (preferImmediate) {
      return scorePurchaseDirectness(b.source_url) - scorePurchaseDirectness(a.source_url);
    }
    return b.confidence - a.confidence;
  });
  return ranked;
}

export function resolveEmotionalState(
  context?: EmotionalRoutingInput["context"],
): EmotionalState {
  if (context?.emotional_state) {
    return context.emotional_state;
  }
  if (context?.urgency === "HIGH") {
    return "urgency";
  }
  if (context?.emotion === "stressed") {
    return "stress";
  }
  if (context?.emotion === "tired") {
    return "fatigue";
  }
  return "neutral";
}

/** Emotion-driven product routing — adjusts count, action, and reason by state. */
export function routeEmotionalProducts(input: EmotionalRoutingInput): EmotionalRoutingWire {
  const strategy = EMOTION_STRATEGIES[input.emotional_state];
  const ranked = rankForEmotion(
    input.candidate_products,
    input.emotional_state,
    strategy.preferImmediate,
  );

  let limit = strategy.maxProducts;
  if (input.emotional_state === "fatigue") {
    limit = ranked.length >= 2 ? 2 : 1;
  }
  if (
    !strategy.allowCompare &&
    (input.context?.compare_mode || input.user_intent === "price_compare")
  ) {
    limit = Math.min(limit, 1);
  }

  const sliced = ranked.slice(0, limit);
  const count = Math.max(Math.min(sliced.length, strategy.maxProducts), sliced.length > 0 ? 1 : 0);

  const recommended_products: EmotionalRoutingWire["recommended_products"] = sliced
    .slice(0, count)
    .map((product, index) => {
      const action = resolveAction(input.user_intent, input.emotional_state, index, strategy);
      return {
        name: product.name,
        reason: buildEmotionReason(input.emotional_state, product, action),
        action,
        source_url: product.source_url,
        price: product.price,
        confidence: product.confidence,
      };
    });

  while (
    input.emotional_state === "neutral" &&
    recommended_products.length < strategy.minProducts &&
    recommended_products.length < ranked.length
  ) {
    const next = ranked[recommended_products.length];
    if (!next) {
      break;
    }
    const action = resolveAction(
      input.user_intent,
      input.emotional_state,
      recommended_products.length,
      strategy,
    );
    recommended_products.push({
      name: next.name,
      reason: buildEmotionReason(input.emotional_state, next, action),
      action,
      source_url: next.source_url,
      price: next.price,
      confidence: next.confidence,
    });
  }

  return {
    emotion: input.emotional_state,
    strategy: strategy.strategy,
    recommended_products,
  };
}

export function routeEmotionalProductsPublic(input: EmotionalRoutingInput): EmotionalRoutingOutput {
  const wire = routeEmotionalProducts(input);
  return {
    emotion: wire.emotion,
    strategy: wire.strategy,
    recommended_products: wire.recommended_products.map(({ name, reason, action }) => ({
      name,
      reason,
      action,
    })),
  };
}

export function routeEmotionalProductsJson(input: EmotionalRoutingInput): string {
  return JSON.stringify(routeEmotionalProductsPublic(input));
}
