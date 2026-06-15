import { buildSemanticFrame } from "@/lib/search-intent/build-semantic-frame";
import { expandQueryCandidates } from "@/lib/search-intent/expand-query-candidates";
import { parseDeeplinkSearchSeed } from "@/lib/search-intent/parse-deeplink-seed";
import { repairQueryCandidates } from "@/lib/search-intent/query-repair";
import {
  QUERY_SCORE_REPAIR_THRESHOLD,
  rankQueryCandidates,
} from "@/lib/search-intent/rank-query-candidates";
import type {
  QueryCandidate,
  ResolveSearchIntentInput,
  ResolvedSearchIntent,
  SemanticFrame,
} from "@/lib/search-intent/types";

/** Reattach frame context to a query string before search routing. */
export function reinjectFrameContext(frame: SemanticFrame, query: string): string {
  const trimmed = query.trim();
  if (!trimmed || !frame.context.trim()) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  const contextLower = frame.context.toLowerCase();
  if (lower.includes(contextLower)) {
    return trimmed;
  }

  const missingEntity = frame.entities.find(
    (entity) => !lower.includes(entity.toLowerCase())
  );
  if (missingEntity) {
    return `${missingEntity} ${trimmed}`.replace(/\s+/g, " ").trim();
  }

  return trimmed;
}

/**
 * Deep link / text → semantic frame → query candidates → rank → optional repair.
 * Deeplink query params are intent seeds, not final queries.
 */
export function resolveSearchIntent(input: ResolveSearchIntentInput): ResolvedSearchIntent {
  const frame = buildSemanticFrame(input);
  let candidates = expandQueryCandidates(frame);
  let ranked = rankQueryCandidates(frame, candidates);

  let repaired = false;
  const topScore = ranked[0]?.score ?? 0;
  if (topScore < QUERY_SCORE_REPAIR_THRESHOLD) {
    candidates = repairQueryCandidates(frame, candidates);
    ranked = rankQueryCandidates(frame, candidates);
    repaired = true;
  }

  const primaryRaw = ranked[0] ?? candidates[0]!;
  const primary: QueryCandidate = {
    ...primaryRaw,
    query: reinjectFrameContext(frame, primaryRaw.query),
    score: primaryRaw.score,
  };

  return {
    frame,
    candidates: ranked.map((candidate) => ({
      ...candidate,
      query: reinjectFrameContext(frame, candidate.query),
    })),
    primary,
    repaired,
  };
}

export function resolveSearchQuery(input: ResolveSearchIntentInput): string {
  return resolveSearchIntent(input).primary.query;
}

export function resolveSearchIntentFromDeeplink(href: string, context?: string): ResolvedSearchIntent | null {
  const seed = parseDeeplinkSearchSeed(href);
  if (!seed) {
    return null;
  }

  return resolveSearchIntent({
    text: seed,
    deeplinkSeed: seed,
    context,
  });
}

export function resolveSearchQueryFromDeeplink(href: string, context?: string): string | null {
  const resolved = resolveSearchIntentFromDeeplink(href, context);
  return resolved?.primary.query ?? null;
}
