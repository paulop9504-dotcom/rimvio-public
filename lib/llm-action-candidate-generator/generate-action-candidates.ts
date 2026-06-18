import { extractContextUnderstanding } from "@/lib/context-understanding/extract-context-understanding";
import {
  detectCandidateDomain,
  isLlmCandidateDomainEnabled,
} from "@/lib/llm-action-candidate-generator/detect-candidate-domain";
import { generateRuleBasedActionCandidates } from "@/lib/llm-action-candidate-generator/rule-generate-candidates";
import {
  buildLlmCandidateUserPrompt,
  LLM_ACTION_CANDIDATE_SYSTEM_PROMPT,
} from "@/lib/llm-action-candidate-generator/system-prompt";
import {
  mergeCandidatePools,
  normalizeLlmCandidates,
  parseLlmCandidateGeneratorWire,
} from "@/lib/llm-action-candidate-generator/validate-candidates";
import {
  filterCandidatesForPlanGate,
  resolvePlanSignalGate,
} from "@/lib/plan-context/resolve-plan-signal-gate";
import type {
  LlmActionCandidateInput,
  LlmActionCandidateResult,
} from "@/lib/llm-action-candidate-generator/types";
import { isOpenAiConfigured, openAiApiKey, openAiModel } from "@/lib/llm/openai-config";

async function callOpenAiCandidates(userPrompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiModel(),
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: LLM_ACTION_CANDIDATE_SYSTEM_PROMPT },
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

export function generateActionCandidatesSync(
  ecId: string,
  input: LlmActionCandidateInput,
): LlmActionCandidateResult {
  const domain =
    input.domain ?? detectCandidateDomain(input.title, input.message);

  if (!isLlmCandidateDomainEnabled(domain)) {
    return { domain: null, candidates: [], source: "rules" };
  }

  const gate = resolvePlanSignalGate(
    input.planMode
      ? { title: input.title, attachMode: "new", windowConfidence: "open", planMode: input.planMode }
      : null,
  );
  const candidates = filterCandidatesForPlanGate(
    generateRuleBasedActionCandidates(ecId, domain, input),
    gate,
  );
  return { domain, candidates, source: "rules" };
}

export async function generateActionCandidates(
  ecId: string,
  input: LlmActionCandidateInput,
  options?: { use_llm?: boolean },
): Promise<LlmActionCandidateResult> {
  const sync = generateActionCandidatesSync(ecId, input);

  if (!sync.domain || sync.candidates.length === 0) {
    return sync;
  }

  const gate = resolvePlanSignalGate(
    input.planMode
      ? { title: input.title, attachMode: "new", windowConfidence: "open", planMode: input.planMode }
      : null,
  );

  const useLlm =
    options?.use_llm !== false && isOpenAiConfigured() && gate.allowLlmVitalitySignals;
  if (!useLlm) {
    return sync;
  }

  try {
    const semantic = extractContextUnderstanding({
      message: input.message,
      system_context: {
        calendar_events: [
          {
            title: input.title,
            location: input.location,
            minutes_until: input.minutes_until_event,
          },
        ],
      },
    });

    const userPrompt = buildLlmCandidateUserPrompt({
      domain: sync.domain,
      title: input.title,
      location: input.location,
      minutes_until_event: input.minutes_until_event,
      message: input.message,
      spawn_phase: input.spawn_phase,
      context_understanding: semantic.context_understanding,
      possible_meanings: semantic.possible_meanings,
    });

    const raw = await callOpenAiCandidates(userPrompt);
    const wire = parseLlmCandidateGeneratorWire(raw);
    if (!wire) {
      return sync;
    }

    const llmCandidates = normalizeLlmCandidates({
      ecId,
      domain: sync.domain,
      wire,
    });

    if (llmCandidates.length === 0) {
      return sync;
    }

    return {
      domain: sync.domain,
      candidates: mergeCandidatePools(llmCandidates, sync.candidates),
      source: "mixed",
    };
  } catch {
    return sync;
  }
}

export function isLlmActionCandidatesEnabled(): boolean {
  if (typeof process !== "undefined") {
    const flag = process.env.RIMVIO_LLM_ACTION_CANDIDATES?.trim().toLowerCase();
    if (flag === "0" || flag === "false") {
      return false;
    }
  }
  return true;
}
