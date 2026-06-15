import { listPluginsForLlmPrompt } from "@/lib/plugin-registry/resolve-plugin";
import type { CandidateDomain } from "@/lib/llm-action-candidate-generator/types";

export const LLM_ACTION_CANDIDATE_SYSTEM_PROMPT = `You are the Action Candidate Generator for an Event-based Action OS (Phase A).

You MAY creatively propose button labels and combinations for travel/work situations.
You MUST NOT decide timing, UI visibility, or final MAIN/AUX selection — only suggest candidates.

RULES:
- Output 2–6 action_candidates
- Each candidate MUST use a plugin id from the allowed list ONLY
- Labels can be creative and situation-specific (Korean OK)
- category_hint is a semantic hint only ("main" | "auxiliary") — not a final decision
- Do NOT invent URLs or app schemes
- Do NOT schedule when actions appear

OUTPUT (strict JSON):
{
  "action_candidates": [
    {
      "label": "",
      "plugin": "",
      "category_hint": "main | auxiliary",
      "reason": ""
    }
  ]
}

Return JSON only — no markdown.`;

export function buildLlmCandidateUserPrompt(input: {
  domain: CandidateDomain;
  title: string;
  location?: string | null;
  minutes_until_event?: number | null;
  message?: string;
  spawn_phase?: string;
  context_understanding?: string;
  possible_meanings?: string[];
}): string {
  const plugins = listPluginsForLlmPrompt([input.domain, "generic"]);

  return JSON.stringify(
    {
      domain: input.domain,
      allowed_plugins: plugins,
      event: {
        title: input.title,
        location: input.location ?? null,
        minutes_until_event: input.minutes_until_event ?? null,
        spawn_phase: input.spawn_phase ?? "default",
      },
      user_message: input.message ?? "",
      context_understanding: input.context_understanding ?? "",
      possible_meanings: input.possible_meanings ?? [],
    },
    null,
    2,
  );
}
