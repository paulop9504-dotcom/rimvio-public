export type {
  FallbackRecoveryCandidate,
  FallbackRecoveryInference,
  FallbackRecoveryFlags,
} from "@/lib/action-chat/fallback-recovery/types";
export {
  inferFallbackRecovery,
  isForbiddenFallbackText,
  isGenericRecoveryEligible,
  isWeakGenericSummary,
} from "@/lib/action-chat/fallback-recovery/infer-fallback-recovery";
export { buildFallbackRecoveryReply } from "@/lib/action-chat/fallback-recovery/build-fallback-recovery-reply";
export {
  CAREER_ROLE_LEXICON,
  extractCareerRoleHint,
  isCareerAspirationMessage,
} from "@/lib/action-chat/fallback-recovery/career-role-bank";
export {
  applyFallbackRecovery,
  buildFallbackRecoveryPromptBlock,
  orchestrateFallbackRecovery,
  resolveClientRecoveryText,
} from "@/lib/action-chat/fallback-recovery/apply-fallback-recovery";
