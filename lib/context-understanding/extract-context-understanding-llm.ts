import { extractContextUnderstanding } from "@/lib/context-understanding/extract-context-understanding";
import {
  buildContextUnderstandingUserPrompt,
  CONTEXT_UNDERSTANDING_SYSTEM_PROMPT,
} from "@/lib/context-understanding/context-understanding-system-prompt";
import {
  parseContextUnderstandingWire,
  validateContextUnderstandingWire,
} from "@/lib/context-understanding/parse-context-understanding-wire";
import type {
  ContextUnderstandingInput,
  ContextUnderstandingWire,
} from "@/lib/context-understanding/types";
import { isOpenAiConfigured, openAiApiKey, openAiModel } from "@/lib/llm/openai-config";

async function callOpenAiJson(userPrompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiModel(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CONTEXT_UNDERSTANDING_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status})`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty LLM response");
  }
  return content;
}

export async function extractContextUnderstandingViaLlm(
  input: ContextUnderstandingInput,
): Promise<{ wire: ContextUnderstandingWire; source: "llm" | "rules" }> {
  const fallback = extractContextUnderstanding(input);

  if (!isOpenAiConfigured()) {
    return { wire: fallback, source: "rules" };
  }

  try {
    const userPrompt = buildContextUnderstandingUserPrompt({
      message: input.message,
      system_context: input.system_context as Record<string, unknown> | undefined,
    });
    const raw = await callOpenAiJson(userPrompt);
    const parsed = parseContextUnderstandingWire(raw);
    if (!parsed) {
      return { wire: fallback, source: "rules" };
    }
    const failures = validateContextUnderstandingWire(parsed);
    if (failures.length > 0) {
      return { wire: fallback, source: "rules" };
    }
    return { wire: parsed, source: "llm" };
  } catch {
    return { wire: fallback, source: "rules" };
  }
}
