import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import type { LinkActionItem } from "@/types/database";
import { isOpenAiConfigured, openAiApiKey, openAiVisionModel } from "@/lib/llm/openai-config";
import {
  assessRisk,
  exceedsGuardrailThreshold,
} from "@/lib/safety/risk-assessor";
import {
  buildGuardrailSystemPrompt,
  buildGuardrailUserPayload,
} from "@/lib/safety/guardrail-prompt";
import { inferGuardrailIntent } from "@/lib/safety/infer-guardrail-intent";
import {
  buildRuleBasedGuardrailWire,
  parseGuardrailResponse,
} from "@/lib/safety/parse-guardrail-response";
import { isGuardrailNegotiation, type GuardrailWire } from "@/lib/safety/types";

function formatGuardrailSummary(wire: GuardrailWire): string {
  const alternatives = wire.options.map((option) => `• ${option.label}`).join("\n");
  return [wire.message_to_user, "", alternatives].filter(Boolean).join("\n");
}

function guardrailOptionsToActions(wire: GuardrailWire): LinkActionItem[] {
  return wire.options.map((option, index) => ({
    id: `guardrail-${wire.action.toLowerCase()}-${index}`,
    label: option.label,
    kind: "custom",
    payload: {
      guardrailOption: true,
      guardrailAction: option.action,
      sourceAction: wire.action,
    },
  }));
}

function guardrailToOrchestratorResult(wire: GuardrailWire): OrchestratorResult {
  return {
    summary: formatGuardrailSummary(wire),
    actions: guardrailOptionsToActions(wire),
    source: "rules",
    confidence: 0.95,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: true,
    metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    guardrail: wire,
    thought: `Guardrail NEGOTIATE_WITH_EMPATHY · risk=${wire.risk_score}`,
  };
}

async function callGuardrailLlm(
  intent: NonNullable<ReturnType<typeof inferGuardrailIntent>>,
  riskScore: number
): Promise<GuardrailWire | null> {
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
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildGuardrailSystemPrompt() },
        { role: "user", content: buildGuardrailUserPayload(intent, riskScore) },
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

  const fallback = buildRuleBasedGuardrailWire({
    action: intent.action,
    actionDescription: intent.action_description,
    riskScore,
    eventCriticality: intent.event.criticality,
    eventTitle: intent.event.title,
  });

  return parseGuardrailResponse(raw, fallback);
}

/**
 * Rimvio Guardrail Pipeline — rule-based risk scoring before LLM/action execution.
 * Returns NEGOTIATE_WITH_EMPATHY result when score >= 80; otherwise null (pass-through).
 */
export async function orchestrateGuardrail(input: {
  message: string;
  referenceDate?: string;
  existingSchedule?: ExistingScheduleInput;
}): Promise<OrchestratorResult | null> {
  const intent = inferGuardrailIntent(input);
  if (!intent) {
    return null;
  }

  const { score } = assessRisk(intent.action, intent.event);
  if (!exceedsGuardrailThreshold(score)) {
    return null;
  }

  const fallback = buildRuleBasedGuardrailWire({
    action: intent.action,
    actionDescription: intent.action_description,
    riskScore: score,
    eventCriticality: intent.event.criticality,
    eventTitle: intent.event.title,
  });

  const llmWire = await callGuardrailLlm(intent, score);
  return guardrailToOrchestratorResult(llmWire ?? fallback);
}

/** Post-orchestration gate: block executable results that exceed threshold. */
export async function applyGuardrailToResult(input: {
  message: string;
  result: OrchestratorResult;
  referenceDate?: string;
  existingSchedule?: ExistingScheduleInput;
}): Promise<OrchestratorResult> {
  if (isGuardrailNegotiation(input.result.guardrail?.decision)) {
    return input.result;
  }

  if (!input.result.actions.length && !input.result.pendingConfirm) {
    return input.result;
  }

  const blocked = await orchestrateGuardrail({
    message: input.message,
    referenceDate: input.referenceDate,
    existingSchedule: input.existingSchedule,
  });

  return blocked ?? input.result;
}
