import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { isOpenAiConfigured, openAiApiKey, openAiVisionModel } from "@/lib/llm/openai-config";
import {
  buildMorningSystemPrompt,
  buildMorningUserPayload,
} from "@/lib/morning-orchestrator/morning-prompt";
import {
  buildRuleBasedMorningBriefing,
  formatMorningBriefingText,
  parseMorningBriefingResponse,
} from "@/lib/morning-orchestrator/parse-morning-response";
import {
  formatMorningContextBlock,
  resolveMorningContext,
} from "@/lib/morning-orchestrator/resolve-morning-context";
import type {
  MorningBriefingWire,
  MorningOrchestrateInput,
} from "@/lib/morning-orchestrator/types";
import type { LinkActionItem } from "@/types/database";

const MORNING_QUERY =
  /(?:아침\s*브리핑|모닝\s*브리핑|morning\s*briefing|굿\s*모닝|good\s*morning|오늘\s*(?:하루|브리핑|시작|아침)|오늘\s*뭐\s*(?:해|할|일)|하루\s*정리|care\s*&\s*act|jarvis|자비스\s*(?:모드|브리핑|현황)|디지털\s*지능|현황\s*보고)/iu;

export function isMorningBriefingQuery(message: string): boolean {
  return MORNING_QUERY.test(message.trim());
}

function briefingActions(wire: MorningBriefingWire): LinkActionItem[] {
  return wire.priority_actions.map((action, index) => ({
    id: `morning-action-${index}`,
    label: action.action_label,
    kind: "custom",
    payload: {
      morningBriefing: true,
      category: action.category,
      content: action.content,
      actionType: action.action_type ?? action.category,
      tone: wire.tone,
    },
  }));
}

function briefingToResult(wire: MorningBriefingWire): OrchestratorResult {
  return {
    summary: formatMorningBriefingText(wire).slice(0, 1200),
    actions: briefingActions(wire),
    source: "rules",
    confidence: 0.94,
    disclosure: "none",
    actionsRevealed: true,
    pendingConfirm: false,
    metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    morningBriefing: wire,
    thought: `Morning ${wire.tone} · providers=${wire.selected_providers.join(",")}`,
  };
}

async function callMorningLlm(
  contextBlock: string,
  message: string,
  tone: MorningBriefingWire["tone"],
  fallback: MorningBriefingWire
): Promise<MorningBriefingWire | null> {
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
      temperature: tone === "jarvis" ? 0.25 : 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildMorningSystemPrompt(tone) },
        { role: "user", content: buildMorningUserPayload(contextBlock, message) },
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

  return parseMorningBriefingResponse(raw, fallback);
}

export async function orchestrateMorningBriefing(
  input: MorningOrchestrateInput
): Promise<OrchestratorResult | null> {
  if (!isMorningBriefingQuery(input.message)) {
    return null;
  }

  const bundle = await resolveMorningContext(input);
  const fallback = buildRuleBasedMorningBriefing(bundle);
  const contextBlock = formatMorningContextBlock(bundle);
  const llmWire = await callMorningLlm(
    contextBlock,
    input.message,
    bundle.tone,
    fallback
  );

  return briefingToResult(llmWire ?? fallback);
}

export { formatMorningBriefingText };
