import {
  entityValues,
  lockEntities,
  tokensOutsideEntities,
} from "@/lib/search-intent/entity-lock";
import { parseDeeplinkSearchSeed } from "@/lib/search-intent/parse-deeplink-seed";
import { normalizeTypoInput } from "@/lib/search-intent/typo-normalizer";
import type { ResolveSearchIntentInput, SearchIntent, SemanticFrame } from "@/lib/search-intent/types";

const FILLER_PREFIX = /^(?:음\.?\.?|어\.?\.?|저기\s*|그\s+|음\s+)*/giu;

const PRICE_MODIFIERS = /(?:가격|얼마|요금|비용|price|cost|얼마야|얼마예요|얼마인)/iu;
const NAV_MODIFIERS =
  /(?:길\s*찾|내비|네비|navigation|navigate|까지\s*가|가\s*줘|가줘|어떻게\s*가)/iu;
const PLACE_MODIFIERS =
  /(?:맛집|추천|카페|식당|레스토랑|어디|근처|주변|베스트|best|spot|place)/iu;
const HOURS_MODIFIERS = /(?:영업\s*시간|영업시간|몇\s*시|휴무|open|closed|라스트\s*오더)/iu;
const RESERVATION_MODIFIERS = /(?:예약|booking|reserve)/iu;
const REVIEW_MODIFIERS = /(?:리뷰|후기|평점|별점|review)/iu;

const STRIP_FOR_MODIFIERS =
  /(?:알려\s*줘|알려줘|찾아\s*줘|찾아줘|검색|해\s*줘|해줘|좀|please|info|information)/giu;

function stripFillers(text: string) {
  return text.replace(FILLER_PREFIX, "").replace(/\s+/g, " ").trim();
}

function detectIntent(tokens: string[], raw: string): SearchIntent {
  const joined = `${raw} ${tokens.join(" ")}`;

  if (NAV_MODIFIERS.test(joined)) {
    return "navigation";
  }
  if (PRICE_MODIFIERS.test(joined)) {
    return "price_inquiry";
  }
  if (RESERVATION_MODIFIERS.test(joined)) {
    return "reservation";
  }
  if (HOURS_MODIFIERS.test(joined)) {
    return "hours_inquiry";
  }
  if (REVIEW_MODIFIERS.test(joined)) {
    return "review_inquiry";
  }
  if (PLACE_MODIFIERS.test(joined)) {
    return "place_search";
  }

  return "general_search";
}

function extractModifiers(tokens: string[], raw: string): string[] {
  const joined = `${raw} ${tokens.join(" ")}`;
  const patterns = [
    { re: PRICE_MODIFIERS, label: "가격" },
    { re: PLACE_MODIFIERS, label: null as string | null },
    { re: HOURS_MODIFIERS, label: "영업시간" },
    { re: RESERVATION_MODIFIERS, label: "예약" },
    { re: REVIEW_MODIFIERS, label: "리뷰" },
  ];

  const modifiers: string[] = [];
  for (const token of tokens) {
    if (token.length >= 2) {
      modifiers.push(token);
    }
  }

  for (const { re, label } of patterns) {
    const match = joined.match(re);
    if (match?.[0]) {
      const value = label ?? match[0].replace(/\s+/g, " ").trim();
      if (!modifiers.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
        modifiers.push(value);
      }
    }
  }

  return [...new Set(modifiers.map((entry) => entry.trim()).filter(Boolean))];
}

function mergeSeedWithText(text: string, seed?: string) {
  if (!seed?.trim()) {
    return text;
  }
  if (!text.trim()) {
    return seed.trim();
  }
  if (text.toLowerCase().includes(seed.trim().toLowerCase())) {
    return text;
  }
  return `${seed.trim()} ${text.trim()}`;
}

/** Build semantic frame — entities locked before any query string is composed. */
export function buildSemanticFrame(input: ResolveSearchIntentInput): SemanticFrame {
  const seedFromLink =
    input.deeplinkSeed?.trim() ||
    (input.text.includes("://") ? parseDeeplinkSearchSeed(input.text) : null);

  const merged = mergeSeedWithText(
    stripFillers(input.text.replace(/https?:\/\/\S+/gi, " ")),
    seedFromLink ?? undefined
  );

  const typo = normalizeTypoInput(merged);
  const withoutNoise = typo.normalized
    .replace(STRIP_FOR_MODIFIERS, " ")
    .replace(/\s+/g, " ")
    .trim();
  const locks = lockEntities(withoutNoise);
  let entities = entityValues(locks);
  const freeTokens = tokensOutsideEntities(withoutNoise, locks);
  const intent = detectIntent(freeTokens, withoutNoise);
  const modifiers = extractModifiers(freeTokens, withoutNoise);

  const context = input.context?.trim() ?? "";

  if (entities.length === 0 && context) {
    entities = entityValues(lockEntities(context));
  }

  return {
    entities,
    intent,
    modifiers,
    context: context || entities.join(" "),
    raw: withoutNoise || seedFromLink || input.text.trim(),
  };
}
