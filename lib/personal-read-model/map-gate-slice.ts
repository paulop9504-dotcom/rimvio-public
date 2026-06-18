import {
  CONFIDENCE_MEDIUM,
  resolveDisclosureTier,
  type ActionDisclosureTier,
} from "@/lib/action-chat/action-confidence";
import { resolveLinkMainOffer } from "@/lib/action-chat/resolve-link-main-offer";
import type { PinScope } from "@/lib/globe/pin-entity";
import { resolveScopeAiPolicy } from "@/lib/scope-ai/scope-ai-policy";
import type { PersonalReadGateSlice } from "@/lib/personal-read-model/types";
import type { LinkRow } from "@/types/database";
import type { TrustStaircaseStage } from "@/lib/preferences/action-trust";

function disclosureToGateTier(tier: ActionDisclosureTier): PersonalReadGateSlice["disclosureTier"] {
  if (tier === "high" || tier === "medium") {
    return "full";
  }
  if (tier === "low") {
    return "soft";
  }
  return "hidden";
}

export function mapGateSlice(input: {
  activeLink?: LinkRow | null;
  trustLevel: TrustStaircaseStage;
  pinScope?: PinScope;
  surface?: "now" | "stack" | "feed";
}): PersonalReadGateSlice {
  const policy = resolveScopeAiPolicy(input.pinScope ?? "internal");
  const forbidRecommendationHero = policy.forbidden.includes("discovery_list_hero");
  const forbidLifeRewrite = policy.forbidden.includes("life_plan_rewrite");

  if (input.activeLink) {
    const offer = resolveLinkMainOffer({
      link: input.activeLink,
      surface: input.surface ?? "now",
    });
    return {
      minConfidenceForMain: CONFIDENCE_MEDIUM,
      disclosureTier: disclosureToGateTier(offer.tier),
      blockedActionTypes: forbidRecommendationHero ? ["recommendation_hero", "discovery_list"] : [],
      urgencyBypass: offer.urgencyBypass,
      forbidLifeRewrite,
      forbidRecommendationHero,
    };
  }

  return {
    minConfidenceForMain: input.trustLevel >= 3 ? CONFIDENCE_MEDIUM : 0.75,
    disclosureTier: input.trustLevel >= 2 ? "soft" : "hidden",
    blockedActionTypes: forbidRecommendationHero ? ["recommendation_hero", "discovery_list"] : [],
    urgencyBypass: false,
    forbidLifeRewrite,
    forbidRecommendationHero,
  };
}
