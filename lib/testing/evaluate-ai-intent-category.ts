import type { AiIntentCategory } from "@/lib/action-chat/classify-ai-intent-utterance";
import { classifyAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { orchestrateEntityQuickPick } from "@/lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { GENERIC_CLARIFY } from "@/lib/testing/evaluate-playbook-category";

export type AiIntentCheckResult = {
  category: AiIntentCategory;
  message: string;
  ok: boolean;
  detail?: string;
};

function isGenericOnly(result: OrchestratorResult): boolean {
  const summary = result.summary?.trim() ?? "";
  const structured = Boolean(
    result.experienceChoice ||
      result.entityQuickPick ||
      result.cafeDiscovery ||
      (result.actions?.length ?? 0) > 0 ||
      result.presentation?.mode
  );
  return summary === GENERIC_CLARIFY && !structured;
}

function isSearchOnly(result: OrchestratorResult): boolean {
  const actions = result.actions ?? [];
  return (
    actions.length > 0 &&
    actions.every((action) => /검색|search/i.test(action.label ?? ""))
  );
}

/** Evaluate pipeline output for one AI-intent category utterance. */
export function evaluateAiIntentCategory(
  expected: AiIntentCategory,
  message: string,
  result: OrchestratorResult
): AiIntentCheckResult {
  const classified = classifyAiIntentUtterance(message);
  if (classified !== expected) {
    return {
      category: expected,
      message,
      ok: false,
      detail: `classifier=${classified ?? "null"} expected=${expected}`,
    };
  }

  if (isGenericOnly(result)) {
    return {
      category: expected,
      message,
      ok: false,
      detail: "generic CLARIFY fallback",
    };
  }

  if (orchestrateEntityQuickPick(message)) {
    return {
      category: expected,
      message,
      ok: false,
      detail: "entity quick pick on AI intent",
    };
  }

  if (result.entityQuickPick) {
    return {
      category: expected,
      message,
      ok: false,
      detail: "pipeline returned entity quick pick",
    };
  }

  if (expected === "COUNSELING") {
    const ok =
      Boolean(result.experienceChoice) ||
      result.source === "conversation" ||
      /힘들|스트레스|괜찮|쉬|걱정|마음|상담|공감/i.test(result.summary ?? "");
    return {
      category: expected,
      message,
      ok,
      detail: ok ? undefined : "counseling tone missing",
    };
  }

  if (expected === "CURIOSITY" || expected === "CREATION" || expected === "INFO") {
    const ok =
      (result.source === "conversation" || result.presentation?.mode === "conversation") &&
      !isSearchOnly(result);
    return {
      category: expected,
      message,
      ok,
      detail: ok ? undefined : "expected conversational path, not search-only",
    };
  }

  const ok =
    !isSearchOnly(result) &&
    (result.source === "conversation" ||
      result.presentation?.mode === "conversation" ||
      Boolean(result.summary && result.summary.length > 12));

  return {
    category: expected,
    message,
    ok,
    detail: ok ? undefined : "weak guidance response",
  };
}

export function formatAiIntentFailure(check: AiIntentCheckResult): string {
  return `#${check.category} "${check.message}" — ${check.detail ?? "fail"}`;
}
