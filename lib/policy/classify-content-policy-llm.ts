import { isOpenAiConfigured, openAiApiKey, openAiVisionModel } from "@/lib/llm/openai-config";
import type { ContentPolicyDecision } from "@/lib/policy/classify-content-policy";
import {
  buildPolicyLlmSystemPrompt,
  buildPolicyLlmUserPayload,
} from "@/lib/policy/policy-llm-prompt";
import { parsePolicyLlmWire } from "@/lib/policy/parse-policy-llm-wire";

/** LLM wire classification for ambiguous messages only — no user-facing copy. */
export async function classifyContentPolicyWithLlm(
  message: string
): Promise<ContentPolicyDecision | null> {
  if (!isOpenAiConfigured()) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiVisionModel(),
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildPolicyLlmSystemPrompt() },
        { role: "user", content: buildPolicyLlmUserPayload(message) },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = payload.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    return null;
  }

  return parsePolicyLlmWire(raw);
}
