import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { compileExperienceChoiceWire } from "@/lib/experience/compile-experience-choice";
import {
  inferExperienceMode,
  isMemoryMomentQuery,
} from "@/lib/experience/infer-experience-mode";
import type { ExperienceChoiceWire } from "@/lib/experience/types";
import type { LinkActionItem } from "@/types/database";

function choiceToActions(wire: ExperienceChoiceWire): LinkActionItem[] {
  return wire.options.map((option, index) => ({
    id: `experience-choice-${index}`,
    label: option.label,
    kind: "custom",
    payload: {
      experienceChoice: true,
      experienceChoicePrompt: option.prompt,
      experienceLens: option.lens,
    },
  }));
}

function toResult(wire: ExperienceChoiceWire): OrchestratorResult {
  return {
    summary: wire.headline,
    actions: choiceToActions(wire),
    source: "rules",
    confidence: 0.9,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
    },
    experienceChoice: wire,
    presentation: { mode: "EXPERIENCE_CHOICE" },
    thought: `ExperienceMode · ${wire.mode} · ASK_CHOICE · ${wire.context_hint ?? ""}`,
  };
}

/**
 * Empathy buffer — MEMORY social context: question before efficiency answer.
 */
export function orchestrateExperienceGuidance(
  message: string
): OrchestratorResult | null {
  const mode = inferExperienceMode(message);

  const trapWire = compileExperienceChoiceWire(message);
  if (trapWire) {
    return toResult(trapWire);
  }

  if (mode === "MEMORY" && isMemoryMomentQuery(message) && /어디|뭐\s*먹|추천|갈/u.test(message)) {
    return toResult({
      mode: "MEMORY",
      action: "ASK_CHOICE",
      headline: "함께 가기 좋은 곳부터 볼까요?",
      empathy_line: "거리보다 분위기·뷰·대화하기 좋은 곳이 추억에 더 남을 수 있어요.",
      context_hint: "Haven · Nexus · MEMORY",
      options: [
        {
          label: "분위기·뷰 좋은 곳",
          prompt: `${message.trim()} — 분위기·뷰 좋은 곳으로 추천해줘`,
          lens: "memory",
        },
        {
          label: "대화하기 좋은 곳",
          prompt: "친구들이랑 대화하기 좋은 곳 추천해줘",
          lens: "memory",
        },
        {
          label: "친구들한테 물어보기",
          prompt: "친구들한테 어디서 먹을지 물어보는 말 만들어줘",
          lens: "ask_group",
        },
      ],
    });
  }

  return null;
}

export { inferExperienceMode, experienceWeights } from "@/lib/experience/infer-experience-mode";
