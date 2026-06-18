export type EmotionalState = "fatigue" | "stress" | "urgency" | "boredom" | "neutral";

export type ProductActionType = "BUY" | "VIEW" | "BOOK";

export type ProductInjectorContext = {
  location?: string;
  urgency?: "LOW" | "MID" | "HIGH";
  /** KRW budget ceiling when known */
  budget?: number | null;
  /** @deprecated use emotional_state */
  emotion?: "neutral" | "tired" | "stressed";
  emotional_state?: EmotionalState;
  compare_mode?: boolean;
  time?: string;
};

export type ProductInjectorInput = {
  user_intent: string;
  query: string;
  context?: ProductInjectorContext;
};

export type ProductCandidate = {
  name: string;
  price: string;
  reason: string;
  source_url: string;
  confidence: number;
};

export type ProductInjectorOutput = {
  intent: string;
  products: ProductCandidate[];
  selected_product?: ProductDecisionOutput["selected_product"] & {
    source_url: string;
    price: string;
  };
  emotional_routing?: EmotionalRoutingOutput;
  /** Action-ready products with URLs (orchestrator / client). */
  emotional_products?: EmotionalRecommendedProduct[];
};

export type EmotionalRecommendedProduct = {
  name: string;
  reason: string;
  action: ProductActionType;
  source_url: string;
  price: string;
  confidence: number;
};

export type EmotionalRoutingInput = {
  user_intent: string;
  emotional_state: EmotionalState;
  context?: ProductInjectorContext;
  candidate_products: ProductCandidate[];
};

export type EmotionalRoutingOutput = {
  emotion: EmotionalState;
  strategy: string;
  recommended_products: Array<{
    name: string;
    reason: string;
    action: ProductActionType;
  }>;
};

/** Internal wire with URLs for orchestrator actions. */
export type EmotionalRoutingWire = EmotionalRoutingOutput & {
  recommended_products: EmotionalRecommendedProduct[];
};

export type ProductDecisionInput = {
  intent: string;
  query: string;
  context?: ProductInjectorContext;
  candidate_products: ProductCandidate[];
};

export type ProductDecisionOutput = {
  selected_product: {
    name: string;
    reason: string;
    confidence: number;
    fallback_hidden: true;
  };
};

export type SelectedProductWire = ProductDecisionOutput["selected_product"] & {
  source_url: string;
  price: string;
};

export type RawProductCandidate = {
  name: string;
  price: number | null;
  source_url: string;
  source: "naver_shop" | "naver_shop_web";
  specHint?: string | null;
};
