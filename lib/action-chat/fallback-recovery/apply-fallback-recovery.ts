import {
  mergeOrchestratorMetadata,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import type { AdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/types";
import { buildFallbackRecoveryReply } from "@/lib/action-chat/fallback-recovery/build-fallback-recovery-reply";
import {
  inferFallbackRecovery,
  isForbiddenFallbackText,
  isGenericRecoveryEligible,
} from "@/lib/action-chat/fallback-recovery/infer-fallback-recovery";
import type { FallbackRecoveryFlags } from "@/lib/action-chat/fallback-recovery/types";

export function buildFallbackRecoveryPromptBlock(): string {
  return [
    "# [FALLBACK RECOVERY LAYER]",
    "Obey [CORE OPERATING LAW] §2 (no dead end) and §9 (fallback = continuation).",
    "",
    "When rules pipeline yields weak/generic copy, infer intent and continue:",
    "- one inference + follow-up question OR 2–3 interpretations",
    "- never generic error strings (see Core Law §1)",
    "",
    "Example:",
    'Input: "의사가 되고싶어"',
    'Good: "의사가 되고 싶은 거면 진로 준비 쪽… 공부 방향 vs 준비 방법?"',
  ].join("\n");
}

export function orchestrateFallbackRecovery(
  message: string,
  adaptive?: AdaptiveBehaviorContext
): OrchestratorResult {
  const inference = inferFallbackRecovery(message);
  return {
    summary: buildFallbackRecoveryReply(message),
    actions: [],
    source: "conversation",
    confidence: 0.62,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "conversation" },
    metadata: {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      semantic_reason: "fallback_recovery",
      routing_patch: "FALLBACK_RECOVERY",
      fallback_recovery: true,
      recovery_primary: inference.primary,
      recovery_candidates: inference.candidates,
      simplify_mode: adaptive?.simplifyMode,
    },
  };
}

export function applyFallbackRecovery(
  result: OrchestratorResult,
  message: string
): OrchestratorResult {
  if (
    result.metadata?.frustration_escape === true ||
    result.metadata?.routing_patch === "UX_FRUSTRATION_ESCAPE"
  ) {
    return result;
  }

  const summary = result.summary?.trim();
  const needsRecovery =
    isGenericRecoveryEligible(summary, message) ||
    (isForbiddenFallbackText(summary) && !result.actions?.length);

  if (!needsRecovery) {
    if (summary && isForbiddenFallbackText(summary)) {
      return {
        ...result,
        summary: buildFallbackRecoveryReply(message),
        metadata: mergeOrchestratorMetadata(result.metadata, {
          fallback_recovery: true,
        }),
      };
    }
    return result;
  }

  const inference = inferFallbackRecovery(message);
  const flags: FallbackRecoveryFlags = {
    recovered: true,
    inference,
  };

  return {
    ...result,
    summary: buildFallbackRecoveryReply(message),
    source: result.source === "rules" ? "conversation" : result.source,
    confidence: Math.max(result.confidence ?? 0, 0.62),
    metadata: mergeOrchestratorMetadata(result.metadata, {
      fallback_recovery: true,
      recovery_primary: inference.primary,
      recovery_candidates: inference.candidates,
      recovery_flags: flags,
    }),
  };
}

/** Client-side recovery when API fails but user message is known. */
export function resolveClientRecoveryText(userMessage: string): string {
  return buildFallbackRecoveryReply(userMessage);
}
