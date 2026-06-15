import { isAirportLikeTitle } from "@/lib/action-projection/detect-travel-event";
import type { CandidateDomain } from "@/lib/llm-action-candidate-generator/types";

const OVERSEAS_TRAVEL =
  /(?:해외|출국|출장|여행|trip|abroad|overseas|비행|항공|오사카|도쿄|일본|태국|유럽|미국|airport|공항|ICN|KIX|NRT)/iu;

const WORK_EVENT =
  /(?:미팅|회의|meeting|파트너|외부|zoom|화상|발표|인터뷰|출장)/iu;

export function detectCandidateDomain(title: string, message?: string): CandidateDomain | null {
  const text = [title, message].filter(Boolean).join(" · ");

  if (isAirportLikeTitle(text) || OVERSEAS_TRAVEL.test(text)) {
    return "travel";
  }

  if (WORK_EVENT.test(text)) {
    return "work";
  }

  return null;
}

export function isLlmCandidateDomainEnabled(domain: CandidateDomain | null): domain is CandidateDomain {
  return domain === "travel" || domain === "work";
}
