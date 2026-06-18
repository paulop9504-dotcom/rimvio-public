import { isOpenAiConfigured, openAiApiKey, openAiModel } from "@/lib/llm/openai-config";
import { extractIntentContext } from "@/lib/intent-context-extractor/extract-intent-context";
import {
  buildIntentContextUserPrompt,
  INTENT_CONTEXT_EXTRACTOR_SYSTEM_PROMPT,
} from "@/lib/intent-context-extractor/intent-context-system-prompt";
import {
  parseIntentContextWire,
  validateIntentContextWire,
} from "@/lib/intent-context-extractor/parse-intent-context-wire";
import type {
  IntentContextExtractInput,
  IntentContextWire,
} from "@/lib/intent-context-extractor/types";

async function callOpenAiJson(userPrompt: string): Promise<string> {
  const { apiKey, model } = { apiKey: openAiApiKey(), model: openAiModel() };
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: INTENT_CONTEXT_EXTRACTOR_SYSTEM_PROMPT },
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

/**
 * Optional LLM path — falls back to rule extractor when OpenAI unavailable or parse fails.
 */
export async function extractIntentContextViaLlm(
  input: IntentContextExtractInput,
): Promise<{ wire: IntentContextWire; source: "llm" | "rules" }> {
  const fallback = extractIntentContext(input);

  if (!isOpenAiConfigured()) {
    return { wire: fallback, source: "rules" };
  }

  try {
    const userPrompt = buildIntentContextUserPrompt({
      message: input.message,
      event: input.event,
      signals: input.signals,
    });
    const raw = await callOpenAiJson(userPrompt);
    const parsed = parseIntentContextWire(raw);
    if (!parsed) {
      return { wire: fallback, source: "rules" };
    }
    const failures = validateIntentContextWire(parsed);
    if (failures.length > 0) {
      return { wire: fallback, source: "rules" };
    }
    return { wire: parsed, source: "llm" };
  } catch {
    return { wire: fallback, source: "rules" };
  }
}
