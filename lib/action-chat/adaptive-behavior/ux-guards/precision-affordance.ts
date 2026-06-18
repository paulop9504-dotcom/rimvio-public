import type { AiIntentCategory } from "@/lib/action-chat/classify-ai-intent-utterance";
import type { AbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import { isLowAbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import type { UxGuardFlags } from "@/lib/action-chat/adaptive-behavior/ux-guards/types";

export type PrecisionAffordanceLevel = "minimal" | "rich";

/** Rich icons/buttons only when domain is clear (L2+) and guards allow. */
export function resolvePrecisionAffordance(input: {
  abstractionLevel: AbstractionLevel;
  ux: UxGuardFlags;
  aiIntent?: AiIntentCategory | null;
}): PrecisionAffordanceLevel {
  if (
    input.ux.frustrationEscape ||
    input.ux.activeListening ||
    input.ux.simplifyMode
  ) {
    return "minimal";
  }

  if (isLowAbstractionLevel(input.abstractionLevel)) {
    return "minimal";
  }

  if (input.aiIntent === "COUNSELING" || input.aiIntent === "CURIOSITY") {
    return "minimal";
  }

  return "rich";
}
