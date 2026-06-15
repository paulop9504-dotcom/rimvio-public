import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { RIMVIO_CONVERSATION_LINES } from "@/lib/action-chat/rimvio-persona";
import { sanitizePersonaSurface } from "@/lib/action-chat/adaptive-persona/apply-adaptive-persona";
import { buildFallbackRecoveryReply } from "@/lib/action-chat/fallback-recovery/build-fallback-recovery-reply";
import { isGenericRecoveryEligible } from "@/lib/action-chat/fallback-recovery/infer-fallback-recovery";

type SummarySource = Pick<
  OrchestratorResult,
  "summary" | "experienceChoice" | "entityQuickPick" | "cafeDiscovery"
>;

/** #7 — Never replace structured orchestrator payloads with generic greeting. */
export function resolveAssistantDisplaySummary(
  payload: SummarySource | null | undefined,
  userMessage?: string
): string {
  const trimmed = payload?.summary?.trim();
  if (trimmed) {
    const clean = sanitizePersonaSurface(trimmed);
    if (userMessage && isGenericRecoveryEligible(clean, userMessage)) {
      return buildFallbackRecoveryReply(userMessage);
    }
    return clean;
  }
  const experienceHeadline = payload?.experienceChoice?.headline?.trim();
  if (experienceHeadline) {
    return experienceHeadline;
  }
  const entityLead = payload?.entityQuickPick?.lead?.trim();
  if (entityLead) {
    return entityLead;
  }
  const discoverySummary = payload?.cafeDiscovery?.summary?.trim();
  if (discoverySummary) {
    return discoverySummary;
  }
  return userMessage?.trim()
    ? buildFallbackRecoveryReply(userMessage)
    : RIMVIO_CONVERSATION_LINES.greeting;
}
