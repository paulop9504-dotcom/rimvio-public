import { inferFallbackRecovery } from "@/lib/action-chat/fallback-recovery/infer-fallback-recovery";
import type { FallbackRecoveryCandidate } from "@/lib/action-chat/fallback-recovery/types";

export const MEAL_OR_VITALITY = /(?:먹|맛집|배고|카페|피곤|힘들|지쳤|쉬고)/iu;

export const RECOVERY_PRIMARY_SKIP_VITALITY = new Set<FallbackRecoveryCandidate>([
  "career_planning",
  "education_planning",
]);

export function shouldSkipVitalityForRecovery(message: string): boolean {
  return RECOVERY_PRIMARY_SKIP_VITALITY.has(inferFallbackRecovery(message).primary);
}
