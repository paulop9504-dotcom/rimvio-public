import {
  buildLlmRouterSystemPrompt,
  buildLlmRouterUserPayload,
} from "@/lib/action-chat/llm-router/build-llm-router-prompt";
import { executeLlmRouterDecision } from "@/lib/action-chat/llm-router/execute-llm-router-decision";
import { parseLlmRouterJson } from "@/lib/action-chat/llm-router/parse-llm-router-json";
import type { LlmRouterInput, LlmRouterOutcome } from "@/lib/action-chat/llm-router/llm-router-types";
import { validateLlmRouterDecision } from "@/lib/action-chat/llm-router/validate-llm-router-decision";
import { formatWeightedHistoryBlock } from "@/lib/action-chat/weighted-history";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { isOpenAiConfigured, openAiApiKey, openAiModel } from "@/lib/llm/openai-config";

const ROUTER_MAX_TOKENS = 220;

export async function routeWithLlm(input: LlmRouterInput): Promise<LlmRouterOutcome | null> {
  if (!isOpenAiConfigured()) {
    return null;
  }

  const historyBlock = input.history?.length
    ? formatWeightedHistoryBlock(input.history as OrchestrateHistoryTurn[], {
        maxTurns: 4,
      })
    : null;

  const requestBody = {
    model: openAiModel(),
    temperature: 0,
    max_tokens: ROUTER_MAX_TOKENS,
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system" as const, content: buildLlmRouterSystemPrompt() },
      {
        role: "user" as const,
        content: buildLlmRouterUserPayload({
          message: input.message,
          historyBlock,
        }),
      },
    ],
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = payload.choices?.[0]?.message?.content?.trim();
    const parsed = parseLlmRouterJson(raw);
    if (!parsed) {
      return null;
    }

    const validated = validateLlmRouterDecision(input.message, parsed);
    if (!validated) {
      return null;
    }

    return executeLlmRouterDecision(validated);
  } catch {
    return null;
  }
}
