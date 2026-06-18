import { isOpenAiConfigured, openAiApiKey, openAiModel } from "@/lib/llm/openai-config";
import {
  buildIngestionParserUserPayload,
  INGESTION_PARSER_PROMPT,
} from "@/lib/data-ingestion/ingestion-parser-prompt";
import {
  normalizePlaceIngestionWire,
  ruleParsePlaceIngestion,
} from "@/lib/data-ingestion/rule-parse-place";
import type { PlaceIngestionSchema } from "@/lib/data-ingestion/types";

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(body);
}

async function llmParsePlaceIngestion(inputText: string): Promise<PlaceIngestionSchema | null> {
  if (!isOpenAiConfigured()) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAiModel(),
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: INGESTION_PARSER_PROMPT },
          { role: "user", content: buildIngestionParserUserPayload(inputText) },
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

    return normalizePlaceIngestionWire(parseJsonObject(raw));
  } catch {
    return null;
  }
}

/** Capture → Inference → Normalization */
export async function parsePlaceIngestion(inputText: string): Promise<PlaceIngestionSchema | null> {
  const trimmed = inputText.trim();
  if (!trimmed) {
    return null;
  }

  const llm = await llmParsePlaceIngestion(trimmed);
  if (llm) {
    return llm;
  }

  return ruleParsePlaceIngestion(trimmed);
}
