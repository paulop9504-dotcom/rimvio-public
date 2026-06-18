import { callOpenAiTextJson } from "@/lib/llm/openai-json-client";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";
import {
  applyMergedWireToBase,
  mergeTemplatesRuleBased,
} from "@/lib/action-template/merge-template-rule";
import { parseMergedTemplateWire } from "@/lib/action-template/parse-merged-template";
import {
  buildTemplateMergeUserPayload,
  TEMPLATE_MERGE_PROTOCOL,
} from "@/lib/action-template/template-merge-protocol";
import type { ActionTemplateSchema, MergedTemplateWire } from "@/lib/action-template/types";

/** Step 2 — Transform: LLM merge with rule fallback. */
export async function mergeTemplatesWithLlm(input: {
  templates: ActionTemplateSchema[];
  message: string;
}): Promise<{ merged: MergedTemplateWire; strategy: "RULE_MERGE" | "LLM_MERGE" }> {
  if (!input.templates.length) {
    throw new Error("no_templates");
  }

  const ruleFallback = mergeTemplatesRuleBased({
    templates: input.templates,
    message: input.message,
  });

  if (!isOpenAiConfigured()) {
    return { merged: ruleFallback, strategy: "RULE_MERGE" };
  }

  try {
    const raw = await callOpenAiTextJson({
      systemPrompt: TEMPLATE_MERGE_PROTOCOL,
      userText: buildTemplateMergeUserPayload({
        templates: input.templates,
        message: input.message,
      }),
      temperature: 0.15,
    });

    if (!raw) {
      return { merged: ruleFallback, strategy: "RULE_MERGE" };
    }

    const parsed = parseMergedTemplateWire(raw);
    if (!parsed) {
      return { merged: ruleFallback, strategy: "RULE_MERGE" };
    }

    applyMergedWireToBase({ templates: input.templates, merged: parsed });

    return { merged: parsed, strategy: "LLM_MERGE" };
  } catch {
    return { merged: ruleFallback, strategy: "RULE_MERGE" };
  }
}
