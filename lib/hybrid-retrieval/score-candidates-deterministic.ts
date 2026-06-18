import { jaccardSimilarity } from "@/lib/commerce/text-similarity";
import { parseCandidatePriceKrw } from "@/lib/hybrid-retrieval/parse-candidate-price";
import { PRODUCTION_SCORE_WEIGHTS } from "@/lib/hybrid-retrieval/production-score-weights";
import { scorePurchaseDirectness } from "@/lib/product-injector/is-product-page-url";
import type {
  DecomposedIntent,
  HybridCandidate,
  HybridCandidateScores,
  HybridRetrievalContext,
} from "@/lib/hybrid-retrieval/types";

const TRUSTED_HOSTS =
  /(?:coupang\.com|smartstore\.naver|shopping\.naver|11st\.co\.kr|gmarket|musinsa|baemin|coupangeats|toss\.im|kakaobank)/i;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function scoreTrust(candidate: HybridCandidate): number {
  let trust = candidate.kind === "product" ? 0.55 : 0.65;
  if (candidate.evidence.includes("naver_shop") && !candidate.evidence.includes("_web")) {
    trust += 0.2;
  }
  if (TRUSTED_HOSTS.test(candidate.url)) {
    trust += 0.15;
  }
  return clamp01(trust);
}

function scoreConversion(decomposed: DecomposedIntent, candidate: HybridCandidate): number {
  if (candidate.kind === "service") {
    return decomposed.intent === "service" || decomposed.sub_intent.includes("order") ? 0.9 : 0.7;
  }

  const directness = scorePurchaseDirectness(candidate.url);
  let conversion = directness * 0.7 + 0.2;
  if (decomposed.intent === "purchase") {
    conversion += 0.1;
  }
  if (candidate.price) {
    conversion += 0.05;
  }
  return clamp01(conversion);
}

function scoreIntentMatch(decomposed: DecomposedIntent, candidate: HybridCandidate): number {
  const textSim = jaccardSimilarity(decomposed.query, candidate.name);
  let intentMatch = textSim;

  if (candidate.kind === "service" && decomposed.intent === "service") {
    intentMatch += 0.25;
  }
  if (
    decomposed.sub_intent === "food_order" &&
    /(?:배민|쿠팡이츠|요기요|baemin|coupang)/i.test(candidate.url)
  ) {
    intentMatch += 0.2;
  }

  return clamp01(intentMatch);
}

function scorePriceFit(candidate: HybridCandidate, context?: HybridRetrievalContext): number {
  const budget = context?.budget;
  const price = parseCandidatePriceKrw(candidate.price);

  if (!budget || budget <= 0) {
    return price ? 0.62 : 0.5;
  }

  if (!price) {
    return 0.45;
  }

  if (price <= budget) {
    const headroom = (budget - price) / budget;
    return clamp01(0.72 + headroom * 0.28);
  }

  const overRatio = (price - budget) / budget;
  return clamp01(Math.max(0.12, 0.45 - overRatio * 0.35));
}

function scoreUrgencyFit(decomposed: DecomposedIntent, candidate: HybridCandidate): number {
  const directness = scorePurchaseDirectness(candidate.url);
  let urgencyFit = candidate.kind === "service" ? 0.85 : directness;

  if (decomposed.urgency === "HIGH") {
    urgencyFit += 0.1;
  } else if (decomposed.urgency === "LOW") {
    urgencyFit -= 0.05;
  }

  if (decomposed.emotional_state === "urgency") {
    urgencyFit += 0.05;
  }

  if (candidate.kind === "service" && decomposed.sub_intent === "food_order") {
    urgencyFit += 0.08;
  }

  return clamp01(urgencyFit);
}

function scoreContextFit(
  decomposed: DecomposedIntent,
  candidate: HybridCandidate,
  context?: HybridRetrievalContext,
): number {
  let contextFit = 0.5;
  const location = context?.location?.trim();

  if (location && location.length >= 2) {
    const locationHit =
      candidate.name.includes(location) ||
      candidate.url.includes(encodeURIComponent(location)) ||
      jaccardSimilarity(location, candidate.name) >= 0.35;
    if (locationHit) {
      contextFit += 0.25;
    }
  }

  const emotional = context?.emotional_state ?? decomposed.emotional_state;
  if (emotional === "fatigue" && candidate.kind === "service") {
    contextFit += 0.08;
  }
  if (emotional === "stress" && /(?:배달|delivery|quick|fast)/i.test(candidate.url + candidate.name)) {
    contextFit += 0.06;
  }
  if (emotional === "boredom" && decomposed.intent === "recommend") {
    contextFit += 0.05;
  }

  if (context?.compare_mode && candidate.kind === "product") {
    contextFit += 0.08;
  }

  return clamp01(contextFit);
}

function scoreFreshnessBoost(candidate: HybridCandidate): number {
  if (candidate.evidence.includes("naver_shop") && !candidate.evidence.includes("_web")) {
    return 0.88;
  }
  if (candidate.evidence.includes("naver_shop_web")) {
    return 0.68;
  }
  if (candidate.kind === "service") {
    return 0.76;
  }
  return 0.52;
}

export function mergeProductionScore(
  scores: Omit<HybridCandidateScores, "final_score" | "learned_weight">,
): number {
  const weights = PRODUCTION_SCORE_WEIGHTS;
  return clamp01(
    scores.intent_match * weights.intent_match +
      scores.conversion_rate * weights.conversion_rate +
      scores.trust_score * weights.trust_score +
      scores.price_fit * weights.price_fit +
      scores.urgency_fit * weights.urgency_fit +
      scores.context_fit * weights.context_fit +
      scores.freshness_boost * weights.freshness_boost,
  );
}

/** @deprecated Use mergeProductionScore — kept for callers/tests. */
export const mergeHybridScore = mergeProductionScore;

/** Production 7-factor deterministic scoring — no LLM required. */
export function scoreCandidatesDeterministic(input: {
  decomposed: DecomposedIntent;
  candidates: HybridCandidate[];
  context?: HybridRetrievalContext;
}): Array<HybridCandidate & { scores: HybridCandidateScores }> {
  return input.candidates.map((candidate) => {
    const partial = {
      intent_match: scoreIntentMatch(input.decomposed, candidate),
      conversion_rate: scoreConversion(input.decomposed, candidate),
      trust_score: scoreTrust(candidate),
      price_fit: scorePriceFit(candidate, input.context),
      urgency_fit: scoreUrgencyFit(input.decomposed, candidate),
      context_fit: scoreContextFit(input.decomposed, candidate, input.context),
      freshness_boost: scoreFreshnessBoost(candidate),
    };
    const final_score = mergeProductionScore(partial);

    return {
      ...candidate,
      scores: { ...partial, final_score },
    };
  });
}

/** Map legacy 4-axis LLM output into production dimensions. */
export function mapLegacyLlmAxesToProduction(input: {
  relevance: number;
  conversion: number;
  trust: number;
  immediacy: number;
  decomposed: DecomposedIntent;
  candidate: HybridCandidate;
  context?: HybridRetrievalContext;
}): Omit<HybridCandidateScores, "final_score" | "learned_weight"> {
  const deterministic = scoreCandidatesDeterministic({
    decomposed: input.decomposed,
    candidates: [input.candidate],
    context: input.context,
  })[0]?.scores;

  const det = deterministic ?? {
    intent_match: 0.5,
    conversion_rate: 0.5,
    trust_score: 0.5,
    price_fit: 0.5,
    urgency_fit: 0.5,
    context_fit: 0.5,
    freshness_boost: 0.5,
    final_score: 0.5,
  };

  return {
    intent_match: clamp01(input.relevance * 0.65 + det.intent_match * 0.35),
    conversion_rate: clamp01(input.conversion * 0.65 + det.conversion_rate * 0.35),
    trust_score: clamp01(input.trust * 0.6 + det.trust_score * 0.4),
    price_fit: det.price_fit,
    urgency_fit: clamp01(input.immediacy * 0.65 + det.urgency_fit * 0.35),
    context_fit: det.context_fit,
    freshness_boost: det.freshness_boost,
  };
}
