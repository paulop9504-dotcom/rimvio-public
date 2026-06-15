export type {
  ActionType,
  KoreanServiceEntry,
  KoreanServiceRoutingResult,
  ServiceCategory,
  UrgencyLevel,
} from "@/lib/korean-service-router/types";

export {
  getCatalogSize,
  getServiceById,
  getServicesByCategory,
  KOREAN_SERVICE_CATALOG,
} from "@/lib/korean-service-router/service-catalog";

export {
  CATEGORY_INTENT_RULES,
  shouldDeferToPlaceDiscovery,
} from "@/lib/korean-service-router/category-intents";

export {
  resolveKoreanServiceDeeplink,
  resolveKoreanServiceDeeplinkJson,
} from "@/lib/korean-service-router/resolve-korean-service-deeplink";

export { orchestrateKoreanServiceRouter } from "@/lib/korean-service-router/orchestrate-korean-service-router";
