/**
 * Scope AI policy — persona + allowed/forbidden capabilities.
 * @see docs/RIMVIO_SCOPE_AI.md
 */

import type { PinScope } from "@/lib/globe/pin-entity";
import type { ScopeAiPersona, ScopeAiPolicy } from "@/lib/scope-ai/scope-ai-types";

const INTERNAL_POLICY: ScopeAiPolicy = {
  scope: "internal",
  persona: "guardian",
  slogan: "Don't miss what matters.",
  verbs: ["recall", "nudge", "preserve"],
  allowed: ["recall_surface", "proactive_nudge", "preserve_intent"],
  forbidden: [
    "discovery_list_hero",
    "trace_compose",
    "intent_override",
    "life_plan_rewrite",
  ],
};

const EXTERNAL_POLICY: ScopeAiPolicy = {
  scope: "external",
  persona: "explorer",
  slogan: "Discover what connects.",
  verbs: ["discover", "connect", "compose"],
  allowed: ["discover_traces", "connect_threads", "compose_flow"],
  forbidden: ["private_schedule_nudge", "life_plan_rewrite"],
};

export function resolveScopeAiPersona(scope: PinScope): ScopeAiPersona {
  return scope === "external" ? "explorer" : "guardian";
}

export function resolveScopeAiPolicy(scope: PinScope): ScopeAiPolicy {
  return scope === "external" ? EXTERNAL_POLICY : INTERNAL_POLICY;
}

export function scopeAiAllows(
  policy: ScopeAiPolicy,
  capability: ScopeAiPolicy["allowed"][number] | ScopeAiPolicy["forbidden"][number],
): boolean {
  if (policy.forbidden.includes(capability as ScopeAiPolicy["forbidden"][number])) {
    return false;
  }
  return policy.allowed.includes(capability as ScopeAiPolicy["allowed"][number]);
}
