export type {
  QueryCandidate,
  QueryCandidateKind,
  ResolveSearchIntentInput,
  ResolvedSearchIntent,
  SearchIntent,
  SemanticFrame,
} from "@/lib/search-intent/types";

export { lockEntities, entityValues, allEntitiesPreserved } from "@/lib/search-intent/entity-lock";
export { parseDeeplinkSearchSeed } from "@/lib/search-intent/parse-deeplink-seed";
export { buildSemanticFrame } from "@/lib/search-intent/build-semantic-frame";
export { expandQueryCandidates, uniqueJoin } from "@/lib/search-intent/expand-query-candidates";
export {
  rankQueryCandidates,
  scoreQueryCandidate,
  QUERY_SCORE_REPAIR_THRESHOLD,
} from "@/lib/search-intent/rank-query-candidates";
export { repairQueryCandidates } from "@/lib/search-intent/query-repair";
export {
  resolveSearchIntent,
  resolveSearchQuery,
  resolveSearchIntentFromDeeplink,
  resolveSearchQueryFromDeeplink,
  reinjectFrameContext,
} from "@/lib/search-intent/resolve-search-intent";
export { normalizeTypoInput, isTypoCase, isIntentShiftCase, similarity } from "@/lib/search-intent/typo-normalizer";
export type { TypoCorrection, TypoNormalizationResult } from "@/lib/search-intent/typo-normalizer";
export { resolveSearchIntentWithEventState } from "@/lib/search-intent/bridge-conversation-event-state";
