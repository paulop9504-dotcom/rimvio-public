import { withArchitectConfidence } from "@/lib/data-architect/confidence";
import { isOpenAiConfigured, openAiApiKey, openAiModel } from "@/lib/llm/openai-config";
import {
  buildDataArchitectSystemPrompt,
  buildDataArchitectUserPayload,
} from "@/lib/data-architect/data-architect-prompt";
import { listExistingContainers } from "@/lib/data-architect/list-existing-containers";
import {
  normalizeArchitectWire,
  ruleClassifyInput,
} from "@/lib/data-architect/rule-classify-input";
import { executeIngestDecision } from "@/lib/data-architect/persist-architect-assignment";
import type { DataArchitectInput, DataArchitectWire } from "@/lib/data-architect/types";

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(body);
}

/** Step 1 — LLM classification: "이 데이터가 어디에 귀속되어야 하는가?" */
async function classifyIngestDecision(
  input: DataArchitectInput,
  fallback: DataArchitectWire
): Promise<DataArchitectWire> {
  if (!isOpenAiConfigured()) {
    return fallback;
  }

  const containers = listExistingContainers();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiModel(),
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildDataArchitectSystemPrompt() },
        {
          role: "user",
          content: buildDataArchitectUserPayload({
            containers,
            rawInput: input.rawInput,
            linkTitle: input.linkTitle,
            linkUrl: input.linkUrl,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    return fallback;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = payload.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    return fallback;
  }

  return normalizeArchitectWire(parseJsonObject(raw), fallback) ?? fallback;
}

/**
 * Ingest orchestrator — classify then execute.
 * Matches: ingestData(rawInput) → decision → append / create / knowledge base
 */
export async function ingestData(input: DataArchitectInput): Promise<DataArchitectWire> {
  const fallback = ruleClassifyInput(input.rawInput);
  const decision = withArchitectConfidence(
    await classifyIngestDecision(input, fallback),
    input.rawInput
  );
  const persisted = await executeIngestDecision({
    wire: decision,
    sourceText: input.rawInput,
  });
  return persisted.wire;
}

export { classifyIngestDecision };
