import {
  buildLlmRouterSystemPrompt,
  buildLlmRouterUserPayload,
} from "@/lib/action-chat/llm-router/build-llm-router-prompt";
import { parseLlmRouterJson } from "@/lib/action-chat/llm-router/parse-llm-router-json";
import { validateLlmRouterDecision } from "@/lib/action-chat/llm-router/validate-llm-router-decision";
import type { LlmRouterInput } from "@/lib/action-chat/llm-router/llm-router-types";
import { openAiApiKey, openAiModel } from "@/lib/llm/openai-config";

/** Surfaces HTTP / parse / validate failure for experiments — not for production hot path. */
export async function debugRouteWithLlm(input: LlmRouterInput): Promise<string | null> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAiModel(),
        temperature: 0,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildLlmRouterSystemPrompt() },
          {
            role: "user",
            content: buildLlmRouterUserPayload({ message: input.message }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      const code = body.match(/"code"\s*:\s*"([^"]+)"/)?.[1];
      return `HTTP ${response.status}${code ? ` (${code})` : ""}`;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content?.trim();
    const parsed = parseLlmRouterJson(raw);
    if (!parsed) {
      return `parse_fail raw=${(raw ?? "").slice(0, 80)}`;
    }
    const validated = validateLlmRouterDecision(input.message, parsed);
    if (!validated) {
      return `validate_fail confidence=${parsed.confidence}`;
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "fetch_error";
  }
}
