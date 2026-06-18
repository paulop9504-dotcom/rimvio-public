import { callOpenAiTextJson } from "@/lib/llm/openai-json-client";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";
import {
  mapLegacyLlmAxesToProduction,
  mergeProductionScore,
  scoreCandidatesDeterministic,
} from "@/lib/hybrid-retrieval/score-candidates-deterministic";
import type {
  DecomposedIntent,
  HybridCandidate,
  HybridCandidateScores,
  HybridRetrievalContext,
} from "@/lib/hybrid-retrieval/types";

type LlmScoreWire = {
  scores?: Array<{
    id?: string;
    relevance?: number;
    conversion?: number;
    trust?: number;
    immediacy?: number;
    intent_match?: number;
    conversion_rate?: number;
    trust_score?: number;
    price_fit?: number;
    urgency_fit?: number;
    context_fit?: number;
    freshness_boost?: number;
  }>;
};

function clamp01(value: unknown): number {
  const num = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.max(0, Math.min(1, Math.round(num * 100) / 100));
}

function buildLlmPrompt(input: {
  decomposed: DecomposedIntent;
  user_query: string;
  candidates: HybridCandidate[];
  context?: HybridRetrievalContext;
}): { systemPrompt: string; userText: string } {
  const candidateLines = input.candidates
    .map(
      (c) =>
        `- id: ${c.id} | kind: ${c.kind} | name: ${c.name} | url: ${c.url}${c.price ? ` | price: ${c.price}` : ""}`,
    )
    .join("\n");

  const budgetLine =
    input.context?.budget && input.context.budget > 0
      ? `budget_krw: ${input.context.budget}`
      : "budget_krw: unknown";

  return {
    systemPrompt: `You score retrieval candidates for actionable user intent.
Return JSON only: {"scores":[{"id":"...","intent_match":0.0,"conversion_rate":0.0,"trust_score":0.0,"price_fit":0.0,"urgency_fit":0.0,"context_fit":0.0,"freshness_boost":0.0}]}
All scores must be 0.0-1.0. Use web evidence only — do not invent products.`,
    userText: `user_query: ${input.user_query}
intent: ${input.decomposed.intent}
sub_intent: ${input.decomposed.sub_intent}
urgency: ${input.decomposed.urgency}
emotional_state: ${input.decomposed.emotional_state}
location: ${input.context?.location ?? "unknown"}
${budgetLine}

candidates:
${candidateLines}`,
  };
}

function readProductionAxes(
  entry: NonNullable<LlmScoreWire["scores"]>[number],
  decomposed: DecomposedIntent,
  candidate: HybridCandidate,
  context?: HybridRetrievalContext,
): Omit<HybridCandidateScores, "final_score" | "learned_weight"> | null {
  if (
    entry.intent_match !== undefined ||
    entry.conversion_rate !== undefined ||
    entry.trust_score !== undefined
  ) {
    return {
      intent_match: clamp01(entry.intent_match),
      conversion_rate: clamp01(entry.conversion_rate),
      trust_score: clamp01(entry.trust_score),
      price_fit: clamp01(entry.price_fit ?? 0.5),
      urgency_fit: clamp01(entry.urgency_fit ?? 0.5),
      context_fit: clamp01(entry.context_fit ?? 0.5),
      freshness_boost: clamp01(entry.freshness_boost ?? 0.5),
    };
  }

  if (
    entry.relevance !== undefined ||
    entry.conversion !== undefined ||
    entry.trust !== undefined ||
    entry.immediacy !== undefined
  ) {
    return mapLegacyLlmAxesToProduction({
      relevance: clamp01(entry.relevance),
      conversion: clamp01(entry.conversion),
      trust: clamp01(entry.trust),
      immediacy: clamp01(entry.immediacy),
      decomposed,
      candidate,
      context,
    });
  }

  return null;
}

/** Step 3 — LLM reasoning layer with deterministic fallback. */
export async function scoreCandidatesHybrid(input: {
  decomposed: DecomposedIntent;
  user_query: string;
  candidates: HybridCandidate[];
  context?: HybridRetrievalContext;
}): Promise<Array<HybridCandidate & { scores: HybridCandidateScores }>> {
  const fallback = scoreCandidatesDeterministic({
    decomposed: input.decomposed,
    candidates: input.candidates,
    context: input.context,
  });

  if (!isOpenAiConfigured() || input.candidates.length === 0) {
    return fallback;
  }

  try {
    const prompt = buildLlmPrompt(input);
    const raw = await callOpenAiTextJson({
      systemPrompt: prompt.systemPrompt,
      userText: prompt.userText,
      temperature: 0.1,
    });

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as LlmScoreWire;
    const byId = new Map(
      (parsed.scores ?? []).map((entry) => [entry.id ?? "", entry]),
    );

    const merged = input.candidates.map((candidate, index) => {
      const llmEntry = byId.get(candidate.id);
      const det = fallback[index]?.scores;
      if (!llmEntry || !det) {
        return fallback[index]!;
      }

      const llmAxes = readProductionAxes(
        llmEntry,
        input.decomposed,
        candidate,
        input.context,
      );
      if (!llmAxes) {
        return fallback[index]!;
      }

      const partial = {
        intent_match: clamp01(llmAxes.intent_match * 0.65 + det.intent_match * 0.35),
        conversion_rate: clamp01(llmAxes.conversion_rate * 0.65 + det.conversion_rate * 0.35),
        trust_score: clamp01(llmAxes.trust_score * 0.6 + det.trust_score * 0.4),
        price_fit: clamp01(llmAxes.price_fit * 0.55 + det.price_fit * 0.45),
        urgency_fit: clamp01(llmAxes.urgency_fit * 0.65 + det.urgency_fit * 0.35),
        context_fit: clamp01(llmAxes.context_fit * 0.55 + det.context_fit * 0.45),
        freshness_boost: clamp01(llmAxes.freshness_boost * 0.5 + det.freshness_boost * 0.5),
      };

      return {
        ...candidate,
        scores: { ...partial, final_score: mergeProductionScore(partial) },
      };
    });

    return merged.length > 0 ? merged : fallback;
  } catch {
    return fallback;
  }
}
