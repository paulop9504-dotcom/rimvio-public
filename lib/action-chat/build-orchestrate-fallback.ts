import { orchestrateConversation } from "@/lib/action-chat/conversation-turns";
import { orchestrateFallbackRecovery } from "@/lib/action-chat/fallback-recovery/apply-fallback-recovery";
import { orchestrateByRules } from "@/lib/action-chat/rule-orchestrator";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

/** Last-resort orchestrator output when the main pipeline throws. */
export function buildOrchestrateFallbackResult(input: {
  message: string;
  linkTitle?: string | null;
  linkUrl?: string | null;
}): OrchestratorResult {
  const rules = orchestrateByRules({
    message: input.message,
    linkTitle: input.linkTitle ?? undefined,
    linkUrl: input.linkUrl ?? undefined,
  });
  if (rules.actions.length > 0 || rules.confirmation) {
    return rules;
  }

  const conversation = orchestrateConversation({
    message: input.message,
    linkTitle: input.linkTitle ?? undefined,
  });
  if (conversation) {
    return conversation;
  }

  return orchestrateFallbackRecovery(input.message);
}
