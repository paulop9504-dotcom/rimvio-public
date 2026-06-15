import type { IntentRoute } from "@/lib/action-chat/intent-router";
import {
  trustStageToLabel,
  type MasterOrchestratorContext,
} from "@/lib/action-chat/master-orchestrator-context";
import { buildConversationalSystemPrompt } from "@/lib/action-chat/conversational-system-prompt";
import { buildMasterOrchestratorSystemPrompt } from "@/lib/action-chat/master-orchestrator-prompt";
import { buildMasterContextInjection } from "@/lib/action-chat/master-orchestrator-context";
import type { OrchestratorMode } from "@/lib/action-chat/mode-switching";
import { buildToneInstructionLine, detectTone } from "@/lib/action-chat/mode-switching";
import { generateChainedSystemPrompt } from "@/lib/containers/context-generator";
import { buildConversationCoachBlock } from "@/lib/action-chat/conversation-coach";
import { buildConversationCraftPromptBlock } from "@/lib/action-chat/conversation-craft/build-craft-prompt-block";
import { buildAdaptivePersonaPromptBlock } from "@/lib/action-chat/adaptive-persona/build-adaptive-persona-prompt";
import { buildFallbackRecoveryPromptBlock } from "@/lib/action-chat/fallback-recovery/apply-fallback-recovery";
import { resolveAdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";
import { resolvePersonaContext } from "@/lib/action-chat/adaptive-persona/resolve-persona-mode";
import { buildTikiTakaConversationBlock } from "@/lib/action-chat/tiki-taka-dialogue-prompt";
import { buildCoreOperatingLawPromptBlock } from "@/lib/action-chat/core-operating-law";

export type LayeredGlobalMemory = {
  user_preferences: string;
  important_schedules: string;
  key_projects: string[];
};

export type LayeredActiveTask = {
  current_task: string;
  relevant_context: string;
};

export type LayeredSystemPromptPayload = {
  GLOBAL_MEMORY: LayeredGlobalMemory;
  ACTIVE_TASK: LayeredActiveTask;
  INSTRUCTION: string;
};

const LAYERED_INSTRUCTION =
  "GLOBAL_MEMORY는 항상 인지하고, ACTIVE_TASK와 관련된 내용만 답변하라. 연관 없는 과거 태스크(태풍 등)를 억지로 끼워 넣지 마라. 단, GLOBAL_MEMORY와 ACTIVE_TASK가 실제로 충돌·영향(예: 날씨가 경기 일정에 영향)할 때만 짧게 알려주라.";

function deriveUserPreferences(context: MasterOrchestratorContext): string {
  const hints: string[] = [`응답 신뢰 단계: ${trustStageToLabel(context.trustLevel)}`];

  const topics = new Set(
    context.activeContainers
      .map((item) => item.topic?.trim())
      .filter((topic): topic is string => Boolean(topic))
  );

  if (topics.has("travel")) {
    hints.push("여행·일정 주제 관심");
  }
  if (topics.has("dining") || topics.has("food")) {
    hints.push("맛집·식당 정보 관심");
  }
  if (topics.has("work")) {
    hints.push("업무·프로젝트 정리 선호");
  }
  if (topics.has("study")) {
    hints.push("학습·공부 계획 관심");
  }

  return hints.join(", ");
}

function formatImportantSchedules(context: MasterOrchestratorContext): string {
  const schedule = context.existingSchedule;
  if (schedule.length === 0) {
    return `오늘(${context.currentDate}) 등록된 일정 없음`;
  }

  return schedule.map((item) => `${item.time} ${item.task}`).join("; ");
}

function deriveKeyProjects(context: MasterOrchestratorContext): string[] {
  const titles = context.activeContainers
    .filter((item) => !item.archivedAt)
    .map((item) => item.title.trim())
    .filter(Boolean);

  return titles.length > 0 ? titles.slice(0, 8) : [];
}

export function deriveCurrentTask(input: {
  message: string;
  route: IntentRoute;
}): string {
  const message = input.message.trim();

  if (input.route.intent_type === "NEW_TASK" && input.route.requires_context_switch) {
    const distilled = message
      .replace(/(?:일정\s*(?:잡|등록|추가|만들|넣)|예약\s*해)\s*/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return (distilled || message).slice(0, 80);
  }

  if (input.route.current_topic?.trim()) {
    return input.route.current_topic.trim().slice(0, 80);
  }

  return message.slice(0, 80);
}

export function deriveRelevantContext(input: {
  route: IntentRoute;
  linkTitle?: string | null;
}): string {
  if (input.route.requires_context_switch) {
    return "None";
  }

  if (input.linkTitle?.trim()) {
    return input.linkTitle.trim().slice(0, 80);
  }

  if (input.route.current_topic?.trim()) {
    return input.route.current_topic.trim().slice(0, 80);
  }

  return "None";
}

export function buildLayeredSystemPromptPayload(input: {
  context: MasterOrchestratorContext;
  route: IntentRoute;
  message: string;
  linkTitle?: string | null;
  userPreferencesOverride?: string | null;
}): LayeredSystemPromptPayload {
  return {
    GLOBAL_MEMORY: {
      user_preferences:
        input.userPreferencesOverride?.trim() || deriveUserPreferences(input.context),
      important_schedules: formatImportantSchedules(input.context),
      key_projects: deriveKeyProjects(input.context),
    },
    ACTIVE_TASK: {
      current_task: deriveCurrentTask({
        message: input.message,
        route: input.route,
      }),
      relevant_context: deriveRelevantContext({
        route: input.route,
        linkTitle: input.linkTitle,
      }),
    },
    INSTRUCTION: LAYERED_INSTRUCTION,
  };
}

export function formatLayeredSystemPromptBlock(payload: LayeredSystemPromptPayload): string {
  return `# [SYSTEM_PROMPT]\n${JSON.stringify(payload, null, 2)}`;
}

export function buildLayeredMasterOrchestratorSystemPrompt(input: {
  context: MasterOrchestratorContext;
  route: IntentRoute;
  message: string;
  linkTitle?: string | null;
  userPreferencesOverride?: string | null;
  mode?: OrchestratorMode;
  /** JIT context block — injected dynamically, not baked into static prompt files */
  dynamicContextBlock?: string | null;
}): string {
  const mode = input.mode ?? "action";
  const tone = detectTone(input.message);
  const layered = buildLayeredSystemPromptPayload(input);
  const runtimeContext = buildMasterContextInjection(input.context);
  const personaContext =
    mode === "conversation"
      ? resolvePersonaContext({
          adaptive: resolveAdaptiveBehaviorContext({ message: input.message }),
        })
      : undefined;
  const taskPrompt =
    mode === "conversation"
      ? buildConversationalSystemPrompt({
          tone,
          wittyJson: tone === "WITTY",
        })
      : buildMasterOrchestratorSystemPrompt({
          message: input.message,
          referenceDate: input.context.currentDate,
        });

  const basePrompt = [
    buildCoreOperatingLawPromptBlock(),
    "",
    `# [RUNTIME_CONTEXT]`,
    runtimeContext,
    `- Current Date: ${input.context.currentDate}`,
    `- Orchestrator Mode: ${mode.toUpperCase()}`,
    `- Response Tone: ${tone}`,
    `- ${buildToneInstructionLine(tone)}`,
    "",
    buildConversationCoachBlock(input.route),
    "",
    mode === "conversation" ? `${buildAdaptivePersonaPromptBlock(personaContext)}\n` : "",
    mode === "conversation" ? `${buildFallbackRecoveryPromptBlock()}\n` : "",
    mode === "conversation" ? `${buildConversationCraftPromptBlock()}\n` : "",
    mode === "conversation" ? `${buildTikiTakaConversationBlock()}\n` : "",
    input.dynamicContextBlock?.trim() ? `${input.dynamicContextBlock.trim()}\n` : "",
    formatLayeredSystemPromptBlock(layered),
    "",
    taskPrompt,
  ]
    .filter(Boolean)
    .join("\n");

  const activeChains = input.context.activeChains ?? [];
  if (activeChains.length === 0) {
    return basePrompt;
  }

  return generateChainedSystemPrompt({
    basePrompt,
    activeChains,
  });
}
