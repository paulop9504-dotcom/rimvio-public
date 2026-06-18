import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { classifyContentPolicyWithLlm } from "@/lib/policy/classify-content-policy-llm";
import { classifyContentPolicy } from "@/lib/policy/classify-content-policy";
import { isAmbiguousPolicyMessage } from "@/lib/policy/is-ambiguous-policy-message";
import { buildPolicyWireFromDecision } from "@/lib/policy/policy-persona-registry";
import { isPolicyIntercept, type PolicyWire } from "@/lib/policy/types";
import type { LinkActionItem } from "@/types/database";

function policyOptionsToActions(wire: PolicyWire): LinkActionItem[] {
  return wire.options.map((option, index) => ({
    id: `policy-${wire.policy_action.toLowerCase()}-${index}`,
    label: option.label,
    kind: "custom",
    payload: {
      policyRedirect: true,
      policyRedirectPrompt: option.prompt,
      redirectTag: wire.redirect_tag,
    },
  }));
}

function policyToOrchestratorResult(
  wire: PolicyWire,
  source: "rules" | "openai"
): OrchestratorResult {
  return {
    summary: wire.message,
    actions: policyOptionsToActions(wire),
    source,
    confidence: source === "openai" ? 0.88 : 0.96,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    policy: wire,
    presentation: { mode: "POLICY_REDIRECT" },
    thought: `ContentPolicy · ${source} · ${wire.classification} · ${wire.policy_action}${
      wire.redirect_tag ? ` · ${wire.redirect_tag}` : ""
    }`,
  };
}

function decisionToResult(
  decision: NonNullable<ReturnType<typeof classifyContentPolicy>>,
  source: "rules" | "openai"
): OrchestratorResult | null {
  const wire = buildPolicyWireFromDecision(decision);
  if (!isPolicyIntercept(wire)) {
    return null;
  }
  return policyToOrchestratorResult(wire, source);
}

/**
 * Content policy gate — rules first, LLM JSON wire for ambiguous cases only.
 * Returns null for SAFE (pass-through to standard orchestrator).
 */
export async function orchestrateContentPolicy(
  message: string
): Promise<OrchestratorResult | null> {
  const ruleDecision = classifyContentPolicy(message);
  if (ruleDecision) {
    return decisionToResult(ruleDecision, "rules");
  }

  if (!isAmbiguousPolicyMessage(message)) {
    return null;
  }

  const llmDecision = await classifyContentPolicyWithLlm(message);
  if (!llmDecision) {
    return null;
  }

  return decisionToResult(llmDecision, "openai");
}

export { isPolicyIntercept } from "@/lib/policy/types";
