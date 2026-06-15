import {
  resolveDisclosureTier,
  type ActionDisclosureTier,
} from "@/lib/action-chat/action-confidence";
import {
  readActionTrustSuccessScore,
  resolveTrustStaircaseStage,
  type TrustStaircaseStage,
} from "@/lib/preferences/action-trust";

export type ActionOfferUx = {
  stage: TrustStaircaseStage;
  tier: ActionDisclosureTier;
  actionsRevealed: boolean;
  showConfirmPrompt: boolean;
  showMagicPulse: boolean;
  showActionGrid: boolean;
  emphasizePrimary: boolean;
  offerAutoRun: boolean;
};

export function resolveActionOfferUx(input: {
  confidence: number;
  actionsRevealed?: boolean;
  hasActions: boolean;
  loading?: boolean;
}): ActionOfferUx {
  const stage = resolveTrustStaircaseStage();
  const tier = resolveDisclosureTier(input.confidence);
  const userRevealed = input.actionsRevealed ?? false;

  if (input.loading || !input.hasActions) {
    return {
      stage,
      tier,
      actionsRevealed: false,
      showConfirmPrompt: false,
      showMagicPulse: false,
      showActionGrid: false,
      emphasizePrimary: false,
      offerAutoRun: false,
    };
  }

  if (tier === "low" || tier === "none") {
    return {
      stage,
      tier,
      actionsRevealed: false,
      showConfirmPrompt: false,
      showMagicPulse: false,
      showActionGrid: false,
      emphasizePrimary: false,
      offerAutoRun: false,
    };
  }

  if (stage === 1) {
    return {
      stage,
      tier: tier === "high" ? "medium" : tier,
      actionsRevealed: userRevealed,
      showConfirmPrompt: !userRevealed,
      showMagicPulse: false,
      showActionGrid: userRevealed,
      emphasizePrimary: false,
      offerAutoRun: false,
    };
  }

  if (stage === 2) {
    return {
      stage,
      tier,
      actionsRevealed: true,
      showConfirmPrompt: false,
      showMagicPulse: false,
      showActionGrid: true,
      emphasizePrimary: false,
      offerAutoRun: false,
    };
  }

  return {
    stage,
    tier,
    actionsRevealed: true,
    showConfirmPrompt: false,
    showMagicPulse: false,
    showActionGrid: true,
    emphasizePrimary: true,
    offerAutoRun: readActionTrustSuccessScore() >= 100,
  };
}
