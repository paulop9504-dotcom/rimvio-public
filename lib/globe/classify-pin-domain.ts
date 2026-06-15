/**
 * Deterministic pin domain classification — registry gate before LLM.
 */

import {
  isPinDomainId,
  resolveActivePinDomainId,
  type PinDomainId,
  type PinDomainOverlayId,
} from "@/lib/globe/pin-domain-registry";
import { extractGatheringPinSlots } from "@/lib/globe/extract-gathering-pin-slots";

export type InferredPinDomain = PinDomainId | PinDomainOverlayId;

export type PinDomainClassification = {
  /** Domain stored on commit (gated by PIN_DOMAIN_SHIP_PHASE). */
  domainId: PinDomainId;
  /** Future domain when stub matched (never travel overlay). */
  inferredDomainId: PinDomainId | null;
  slots: Record<string, unknown>;
  confidence: "high" | "low";
};

const MARKET_SIGNAL =
  /(?:팔아|판매|삽니다|팝니다|중고|거래|나눔|양도)/u;
const PRICE_SIGNAL =
  /(?:(\d{1,3}(?:,\d{3})+|\d+)\s*(?:만\s*)?원)/u;
const PROPERTY_SIGNAL =
  /(?:월세|전세|보증금|임대|원룸|투룸|부동산|매물)/u;
const GATHERING_SIGNAL =
  /(?:모임|번개|meetup|모집|같이\s*가|같이\s*해)/iu;
const SERVICE_SIGNAL =
  /(?:수리|청소|과외|레슨|대행|서비스\s*제공)/u;
const JOB_SIGNAL =
  /(?:구인|구직|채용|알바|구합니다|모집합니다)/u;
const TRAVEL_SIGNAL =
  /(?:여행|관광|일정|체크인|항공|숙소|호텔)/u;

function extractPriceKrw(text: string): number | null {
  const match = text.match(PRICE_SIGNAL);
  if (!match?.[1]) {
    return null;
  }
  const raw = match[1].replace(/,/g, "");
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    return null;
  }
  if (/만\s*원/u.test(match[0])) {
    return value * 10_000;
  }
  return value;
}

function inferDomain(text: string): InferredPinDomain {
  const trimmed = text.trim();
  if (!trimmed) {
    return "experience";
  }
  if (PROPERTY_SIGNAL.test(trimmed)) {
    return "property";
  }
  if (MARKET_SIGNAL.test(trimmed) || PRICE_SIGNAL.test(trimmed)) {
    return "market";
  }
  if (GATHERING_SIGNAL.test(trimmed)) {
    return "gathering";
  }
  if (SERVICE_SIGNAL.test(trimmed)) {
    return "service";
  }
  if (JOB_SIGNAL.test(trimmed)) {
    return "job";
  }
  if (TRAVEL_SIGNAL.test(trimmed)) {
    return "travel";
  }
  return "experience";
}

function buildSlots(inferred: InferredPinDomain, text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {};
  }

  switch (inferred) {
    case "market": {
      const priceKrw = extractPriceKrw(trimmed);
      return {
        listingTitle: trimmed.slice(0, 120),
        ...(priceKrw !== null ? { priceKrw } : {}),
      };
    }
    case "property": {
      const depositMatch = trimmed.match(/보증금\s*(\d+(?:,\d{3})*)\s*(?:만)?/u);
      const rentMatch = trimmed.match(/월세\s*(\d+(?:,\d{3})*)\s*(?:만)?/u);
      return {
        listingTitle: trimmed.slice(0, 120),
        ...(depositMatch ? { depositHint: depositMatch[1] } : {}),
        ...(rentMatch ? { monthlyRentHint: rentMatch[1] } : {}),
      };
    }
    case "gathering":
      return extractGatheringPinSlots(trimmed);
    case "service":
    case "job":
    case "travel":
      return { summary: trimmed.slice(0, 160) };
    default:
      return { memo: trimmed.slice(0, 160) };
  }
}

function isHighConfidence(inferred: InferredPinDomain, trimmed: string): boolean {
  if (inferred === "experience") {
    return false;
  }
  if (inferred === "market") {
    return MARKET_SIGNAL.test(trimmed) || PRICE_SIGNAL.test(trimmed);
  }
  if (inferred === "property") {
    return PROPERTY_SIGNAL.test(trimmed);
  }
  if (inferred === "gathering") {
    return GATHERING_SIGNAL.test(trimmed);
  }
  if (inferred === "service") {
    return SERVICE_SIGNAL.test(trimmed);
  }
  if (inferred === "job") {
    return JOB_SIGNAL.test(trimmed);
  }
  if (inferred === "travel") {
    return TRAVEL_SIGNAL.test(trimmed);
  }
  return false;
}

/** Classify composer text into domain + slots. Active commit domain respects P1–P5 gate. */
export function classifyPinDomainFromText(text: string): PinDomainClassification {
  const trimmed = text.trim();
  const inferred = inferDomain(trimmed);
  const domainId = resolveActivePinDomainId(inferred);
  const slots = buildSlots(inferred, trimmed);
  const inferredDomainId =
    isPinDomainId(inferred) && inferred !== domainId ? inferred : null;

  return {
    domainId,
    inferredDomainId,
    slots,
    confidence: isHighConfidence(inferred, trimmed) ? "high" : "low",
  };
}
