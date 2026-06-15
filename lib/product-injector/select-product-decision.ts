import { jaccardSimilarity } from "@/lib/commerce/text-similarity";
import { scorePurchaseDirectness } from "@/lib/product-injector/is-product-page-url";
import type {
  ProductCandidate,
  ProductDecisionInput,
  ProductDecisionOutput,
  SelectedProductWire,
} from "@/lib/product-injector/types";

const IMMEDIATE_REASON_PATTERN = /바로\s*구매|구매\s*가능|즉시/u;

function parsePriceKrw(price: string): number | null {
  const digits = price.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function scoreIntentFit(intent: string, query: string, product: ProductCandidate): number {
  const relevance = jaccardSimilarity(query, product.name);
  let fit = relevance;

  switch (intent) {
    case "purchase":
      if (IMMEDIATE_REASON_PATTERN.test(product.reason)) {
        fit += 0.2;
      }
      break;
    case "recommend":
      fit += product.confidence * 0.15;
      break;
    case "price_compare": {
      const price = parsePriceKrw(product.price);
      fit += price ? 0.25 : 0;
      break;
    }
    default:
      break;
  }

  return Math.min(fit, 1);
}

function scoreImmediacy(product: ProductCandidate, urgency?: "LOW" | "MID" | "HIGH"): number {
  const directness = scorePurchaseDirectness(product.source_url);
  const reasonBoost = IMMEDIATE_REASON_PATTERN.test(product.reason) ? 0.15 : 0;
  let score = directness + reasonBoost;

  if (urgency === "HIGH") {
    score = directness * 0.7 + reasonBoost + (parsePriceKrw(product.price) ? 0.15 : 0);
  }

  return Math.min(score, 1);
}

function scorePriceRealism(
  product: ProductCandidate,
  budget?: number | null,
): number {
  const price = parsePriceKrw(product.price);
  if (!price) {
    return 0.2;
  }

  if (budget && price > budget) {
    return 0;
  }

  if (budget) {
    const ratio = price / budget;
    if (ratio <= 0.85) {
      return 0.95;
    }
    if (ratio <= 1) {
      return 0.8;
    }
  }

  if (price >= 5_000 && price <= 5_000_000) {
    return 0.75;
  }

  return 0.5;
}

/** Lower cognitive load → higher score (shorter name, clearer match). */
function scoreLowFatigue(query: string, product: ProductCandidate): number {
  const tokens = product.name.split(/\s+/).filter(Boolean);
  const lengthPenalty = Math.min(tokens.length / 12, 0.35);
  const clarity = jaccardSimilarity(query, product.name);
  return Math.max(0, Math.min(1, 0.85 - lengthPenalty + clarity * 0.2));
}

function buildDecisionReason(input: {
  intent: string;
  urgency?: "LOW" | "MID" | "HIGH";
  emotion?: "neutral" | "tired" | "stressed";
  compare_mode?: boolean;
  product: ProductCandidate;
}): string {
  if (input.emotion === "tired" || input.emotion === "stressed") {
    return "지금 바로 결정할 수 있는 최적 선택";
  }
  if (input.urgency === "HIGH") {
    return "즉시 구매 가능 · intent 최적";
  }
  if (input.compare_mode || input.intent === "price_compare") {
    return "비교 결과 1위 · 바로 구매 가능";
  }
  if (input.intent === "purchase") {
    return "구매 intent에 가장 적합";
  }
  return input.product.reason || "가장 적합한 상품";
}

function totalScore(input: {
  intent: string;
  query: string;
  context?: ProductDecisionInput["context"];
  product: ProductCandidate;
}): number {
  const { context, product, intent, query } = input;
  const intentFit = scoreIntentFit(intent, query, product);
  const immediacy = scoreImmediacy(product, context?.urgency);
  const priceRealism = scorePriceRealism(product, context?.budget);
  const lowFatigue = scoreLowFatigue(query, product);

  let score = intentFit * 0.4 + immediacy * 0.3 + priceRealism * 0.2 + lowFatigue * 0.1;

  if (context?.urgency === "HIGH") {
    score += immediacy * 0.12;
  }
  if (context?.emotion === "tired" || context?.emotion === "stressed") {
    score += lowFatigue * 0.08 + immediacy * 0.05;
  }
  if (context?.compare_mode || intent === "price_compare") {
    score += priceRealism * 0.08;
  }

  score += product.confidence * 0.05;
  return score;
}

/** Top-1 product decision — always single selection, fallbacks hidden. */
export function selectProductDecision(
  input: ProductDecisionInput,
): ProductDecisionOutput | null {
  const candidates = input.candidate_products.filter((p) => p.name?.trim() && p.source_url?.trim());
  if (candidates.length === 0) {
    return null;
  }

  const ranked = [...candidates].sort((a, b) => {
    const scoreA = totalScore({
      intent: input.intent,
      query: input.query,
      context: input.context,
      product: a,
    });
    const scoreB = totalScore({
      intent: input.intent,
      query: input.query,
      context: input.context,
      product: b,
    });
    return scoreB - scoreA;
  });

  const winner = ranked[0]!;
  const winnerScore = totalScore({
    intent: input.intent,
    query: input.query,
    context: input.context,
    product: winner,
  });

  const confidence = Math.min(0.98, Math.round((0.5 + winnerScore * 0.45) * 100) / 100);

  return {
    selected_product: {
      name: winner.name,
      reason: buildDecisionReason({
        intent: input.intent,
        urgency: input.context?.urgency,
        emotion: input.context?.emotion,
        compare_mode: input.context?.compare_mode,
        product: winner,
      }),
      confidence,
      fallback_hidden: true,
    },
  };
}

export function selectProductDecisionWire(
  input: ProductDecisionInput,
): SelectedProductWire | null {
  const decision = selectProductDecision(input);
  if (!decision) {
    return null;
  }

  const winner =
    input.candidate_products.find((p) => p.name === decision.selected_product.name) ??
    input.candidate_products[0]!;

  return {
    ...decision.selected_product,
    source_url: winner.source_url,
    price: winner.price,
  };
}

export function selectProductDecisionJson(input: ProductDecisionInput): string | null {
  const decision = selectProductDecision(input);
  return decision ? JSON.stringify(decision) : null;
}
