export type {
  EmotionalRecommendedProduct,
  EmotionalRoutingInput,
  EmotionalRoutingOutput,
  EmotionalState,
  ProductActionType,
  ProductCandidate,
  ProductInjectorContext,
  ProductInjectorInput,
  ProductInjectorOutput,
  RawProductCandidate,
} from "@/lib/product-injector/types";

export { injectProducts, injectProductsJson } from "@/lib/product-injector/inject-products";
export {
  buildProductDecisionContext,
  detectCompareMode,
  detectEmotionState,
  detectEmotionalState,
  detectProductUrgency,
  parseBudgetFromMessage,
  parseProductShoppingIntent,
} from "@/lib/product-injector/parse-shopping-intent";
export {
  resolveEmotionalState,
  routeEmotionalProducts,
  routeEmotionalProductsJson,
  routeEmotionalProductsPublic,
} from "@/lib/product-injector/route-emotional-products";
export {
  selectProductDecision,
  selectProductDecisionJson,
  selectProductDecisionWire,
} from "@/lib/product-injector/select-product-decision";
export {
  isBlockedProductUrl,
  isProductPageUrl,
  scorePurchaseDirectness,
} from "@/lib/product-injector/is-product-page-url";
export {
  extractSpecHint,
  hasModelName,
  hasPriceOrSpec,
} from "@/lib/product-injector/has-model-name";
export { fetchWebProductCandidates, parseNaverShoppingWebProducts } from "@/lib/product-injector/fetch-web-product-candidates";
export { rankProductCandidates } from "@/lib/product-injector/rank-product-candidates";
export { orchestrateProductInjector } from "@/lib/product-injector/orchestrate-product-injector";
