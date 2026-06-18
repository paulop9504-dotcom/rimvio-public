import { callOpenAiTextJson } from "@/lib/llm/openai-json-client";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";
import type { VitalityStateMatch } from "@/lib/vitality-state/vitality-state-types";
import {
  buildVitalityStateLlmSystemPrompt,
  buildVitalityStateLlmUserPayload,
} from "@/lib/vitality-state/vitality-state-llm-prompt";
import { parseVitalityStateLlmWire } from "@/lib/vitality-state/parse-vitality-state-llm-wire";
import { isVitalityStateUtterance } from "@/lib/vitality-state/classify-vitality-state-intent";
import { matchVitalityGateLexicon } from "@/lib/vitality-state/vitality-state-gate-lexicon";
import { resolveVitalityStateFromKind } from "@/lib/vitality-state/vitality-state-registry";

/** Generic empathetic fallback when LLM is offline but message is clearly not a place name. */
function fallbackVitalityStateMatch(message: string): VitalityStateMatch | null {
  const trimmed = message.trim();
  const lexiconKind = matchVitalityGateLexicon(trimmed);
  if (lexiconKind) {
    return resolveVitalityStateFromKind(lexiconKind, 0.55);
  }
  if (!isVitalityStateUtterance(message)) {
    return null;
  }
  if (/[파프픈픔]$/u.test(trimmed)) {
    return resolveVitalityStateFromKind("hunger", 0.5);
  }
  return resolveVitalityStateFromKind("generic_state", 0.4);
}

/** LLM-first vitality state classification — no per-phrase regex rules. */
export async function classifyVitalityStateWithLlm(
  message: string
): Promise<VitalityStateMatch | null> {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 160) {
    return null;
  }

  if (
    /https?:\/\/|^\s*(?:길\s*찾|네비|맛집\s*추천|일정\s*잡|예약\s*해|전화(?:해|걸))/iu.test(
      trimmed
    )
  ) {
    return null;
  }

  if (!isOpenAiConfigured()) {
    return fallbackVitalityStateMatch(trimmed);
  }

  try {
    const raw = await callOpenAiTextJson({
      systemPrompt: buildVitalityStateLlmSystemPrompt(),
      userText: buildVitalityStateLlmUserPayload(trimmed),
      temperature: 0.1,
    });
    if (!raw) {
      return fallbackVitalityStateMatch(trimmed);
    }
    return parseVitalityStateLlmWire(raw) ?? fallbackVitalityStateMatch(trimmed);
  } catch {
    return fallbackVitalityStateMatch(trimmed);
  }
}
