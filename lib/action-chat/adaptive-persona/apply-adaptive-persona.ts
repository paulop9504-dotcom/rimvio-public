import {
  mergeOrchestratorMetadata,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import type { AdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/types";
import { resolvePersonaContext } from "@/lib/action-chat/adaptive-persona/resolve-persona-mode";
import type {
  PersonaResultHint,
  PersonaToneMode,
} from "@/lib/action-chat/adaptive-persona/types";

const INTERNAL_LABEL_LEAK =
  /\b(?:L[0-4]|routing(?:_patch)?|vitality(?:_states)?|abstraction(?:_level)?|PATCH\d|UX_[A-Z_]+|CRAFT_[A-Z_]+|semantic_reason|intent_router)\b/giu;

const FORBIDDEN_PHRASES: readonly RegExp[] = [
  /AI(?:로서|가)/giu,
  /모델(?:\s*기준|\s*로는)/giu,
  /시스템(?:적(?:으로)?|(?:\s*상)?)/giu,
  /도움이\s*되(?:었|실)(?:나요|길)/giu,
  /물론이(?:죠|요)/giu,
  /정말\s*좋은\s*질문/giu,
];

const ROBOTIC_FORMAL = /(?:습니다|십시오)(?=[.!?\s]|$)/gu;

function stripInternalLabels(text: string): string {
  return text.replace(INTERNAL_LABEL_LEAK, "").replace(/\s{2,}/gu, " ").trim();
}

function stripForbiddenPhrases(text: string): string {
  let next = text;
  for (const pattern of FORBIDDEN_PHRASES) {
    next = next.replace(pattern, "");
  }
  return next.replace(/\n{3,}/gu, "\n\n").trim();
}

function applyVitalityTone(text: string): string {
  let next = text;
  next = next.replace(/👉\s*어느\s*쪽/giu, "👉 편한 쪽");
  next = next.replace(/(?:반드시|꼭)\s*/gu, "");
  if (/A\)|B\)|C\)/u.test(next)) {
    const lines = next.split("\n");
    const choiceLines = lines.filter((line) => /^[ABC]\)/u.test(line.trim()));
    if (choiceLines.length > 2) {
      const dropC = lines.filter((line) => !/^C\)/u.test(line.trim()));
      next = dropC.join("\n");
    }
  }
  return next;
}

function applyExecutionTone(text: string): string {
  let next = text;
  next = next.replace(/많이\s*고민(?:되|하)셨(?:을|겠)[^.?\n]*[.?\n]?/giu, "");
  next = next.replace(/(?:어떻게\s*생각|어떠(?:세요|신가요))(?:\?)?/giu, "");
  next = next.replace(ROBOTIC_FORMAL, "해요");
  return next.trim();
}

function applyTikiTakaTone(text: string): string {
  if (/[?？]/.test(text) || /👉/u.test(text)) {
    return text;
  }
  if (text.length > 0 && !/[.!?]$/.test(text.trim())) {
    return `${text.trim()}\n\n👉 어떻게 이어갈까요?`;
  }
  return text;
}

export function sanitizePersonaSurface(summary: string): string {
  if (!summary.trim()) {
    return summary;
  }
  return stripForbiddenPhrases(stripInternalLabels(summary));
}

export function transformSummaryWithPersona(
  summary: string,
  mode: PersonaToneMode
): string {
  if (!summary.trim()) {
    return summary;
  }

  let next = sanitizePersonaSurface(summary);

  switch (mode) {
    case "vitality":
      next = applyVitalityTone(next);
      break;
    case "execution":
      next = applyExecutionTone(next);
      break;
    case "tiki_taka":
      next = applyTikiTakaTone(next);
      break;
  }

  return next.trim();
}

function resultHintFromOrchestrator(result: OrchestratorResult): PersonaResultHint {
  const metadata = result.metadata as { intent?: string } | undefined;
  return {
    source: result.source,
    intent: metadata?.intent,
    pendingConfirm: result.pendingConfirm,
    hasActions: Boolean(result.actions?.length),
    actionsRevealed: result.actionsRevealed,
  };
}

export function applyAdaptivePersona(
  result: OrchestratorResult,
  adaptive?: AdaptiveBehaviorContext
): OrchestratorResult {
  const hint = resultHintFromOrchestrator(result);
  const persona = resolvePersonaContext({ adaptive, resultHint: hint });
  const summary = result.summary?.trim();

  if (!summary) {
    return {
      ...result,
      metadata: mergeOrchestratorMetadata(result.metadata, {
        persona_tone: persona.mode,
        persona_stage: persona.stage,
      }),
    };
  }

  return {
    ...result,
    summary: transformSummaryWithPersona(summary, persona.mode),
    metadata: mergeOrchestratorMetadata(result.metadata, {
      persona_tone: persona.mode,
      persona_stage: persona.stage,
    }),
  };
}
