const PURCHASE_PATTERN =
  /(.{2,60}?)\s*(?:사고\s*싶|구매\s*(?:하고\s*)?싶|살\s*까|주문\s*(?:할|하고\s*싶)|장만\s*(?:할|봐))/u;

const RECOMMEND_PATTERN =
  /(.{2,60}?)\s*(?:추천(?:해\s*줘?)?|어디서\s*사|찾아\s*줘|골라\s*줘)/u;

const PRICE_PATTERN =
  /(.{2,60}?)\s*(?:가격|시세|얼마(?:에|야)?|비교)/u;

const NOISE_TAIL =
  /(?:좀|요|줘|주세요|해\s*줘|해줘|빨리|지금|당장|하나|개|좋은|괜찮은|저렴한|싼|best|추천)$/iu;

function cleanQuery(raw: string): string {
  return raw
    .replace(/^(?:나|저|내가|이|그|좀|please)\s+/iu, "")
    .replace(NOISE_TAIL, "")
    .replace(/[?.!]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseProductShoppingIntent(message: string): {
  user_intent: string;
  query: string;
} | null {
  const trimmed = message.trim();
  if (trimmed.length < 3) {
    return null;
  }

  if (/^(?:쿠팡|네이버\s*쇼핑|11번가|g마켓|옥션)\s*(?:열|가|에서)$/iu.test(trimmed)) {
    return null;
  }

  for (const [pattern, intent] of [
    [PURCHASE_PATTERN, "purchase"],
    [RECOMMEND_PATTERN, "recommend"],
    [PRICE_PATTERN, "price_compare"],
  ] as const) {
    const match = trimmed.match(pattern);
    if (!match?.[1]) {
      continue;
    }
    const query = cleanQuery(match[1]);
    if (query.length >= 2) {
      return { user_intent: intent, query };
    }
  }

  const bare = trimmed.match(
    /^(?:무선\s*)?(?:이어폰|헤드셋|노트북|아이패드|아이폰|갤럭시|키보드|마우스|모니터|충전기|텀블러|운동화|가방|향수|선크림|유모차|에어프라이어|청소기|세제|기저귀|분유)/u,
  );
  if (bare && /(?:사|구매|추천|찾|살|주문)/u.test(trimmed)) {
    return { user_intent: "purchase", query: cleanQuery(bare[0]) };
  }

  return null;
}

export function detectProductUrgency(message: string): "LOW" | "MID" | "HIGH" {
  if (/(?:지금|당장|급|빨리|바로|오늘\s*안)/u.test(message)) {
    return "HIGH";
  }
  if (/(?:오늘|내일|이번\s*주)/u.test(message)) {
    return "MID";
  }
  return "LOW";
}

export function parseBudgetFromMessage(message: string): number | null {
  const manMatch = message.match(/(\d+(?:\.\d+)?)\s*만\s*원?(?:\s*(?:이하|까지|안))?/iu);
  if (manMatch?.[1]) {
    return Math.round(Number.parseFloat(manMatch[1]) * 10_000);
  }

  const wonMatch = message.match(/(\d{1,3}(?:,\d{3})+|\d{4,9})\s*원(?:\s*(?:이하|까지|안))?/iu);
  if (wonMatch?.[1]) {
    return Number.parseInt(wonMatch[1].replace(/,/g, ""), 10);
  }

  return null;
}

export function detectEmotionState(message: string): "neutral" | "tired" | "stressed" {
  if (/(?:피곤|지쳤|힘들|졸려|귀찮|지치)/u.test(message)) {
    return "tired";
  }
  if (/(?:스트레스|짜증|불안|답답|우울)/u.test(message)) {
    return "stressed";
  }
  return "neutral";
}

import type { EmotionalState } from "@/lib/product-injector/types";

export function detectEmotionalState(message: string): EmotionalState {
  if (detectProductUrgency(message) === "HIGH") {
    return "urgency";
  }
  if (/(?:스트레스|짜증|불안|답답|우울)/u.test(message)) {
    return "stress";
  }
  if (/(?:피곤|지쳤|힘들|졸려|귀찮|지치)/u.test(message)) {
    return "fatigue";
  }
  if (/(?:심심|지루|뭐\s*하지|볼\s*거|쿨\s*타임|놀\s*거)/u.test(message)) {
    return "boredom";
  }
  return "neutral";
}

export function detectCompareMode(message: string, intent?: string): boolean {
  if (intent === "price_compare") {
    return true;
  }
  return /(?:비교|vs|versus|뭐가\s*나|어디가\s*싸)/iu.test(message);
}

export function buildProductDecisionContext(message: string, intent?: string) {
  const emotional_state = detectEmotionalState(message);
  return {
    urgency: detectProductUrgency(message),
    budget: parseBudgetFromMessage(message),
    emotional_state,
    emotion:
      emotional_state === "fatigue"
        ? ("tired" as const)
        : emotional_state === "stress"
          ? ("stressed" as const)
          : ("neutral" as const),
    compare_mode: detectCompareMode(message, intent),
  };
}
