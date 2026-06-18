import { isAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import { isConversationalOnlyMessage } from "@/lib/action-chat/conversation-turns";
import type { IntentRoute } from "@/lib/action-chat/intent-router-core";
import type { WittyButtonWire } from "@/lib/action-chat/confirmation-types";

export type OrchestratorMode = "action" | "conversation";

export type ResponseTone = "WITTY" | "DEFAULT";

export type IntentRouterDecision = {
  mode: OrchestratorMode;
  reason: string;
  tone: ResponseTone;
};

export type WittyConversationWire = {
  thought?: string;
  persona_message: string;
  witty_buttons: WittyButtonWire[];
};

const WITTY_CUE =
  /(?:몇\s*살|나이\s*(?:가\s*)?(?:몇|어떻)|(?:니|너|네)\s*이름|누구(?:야|니|세요)|이름\s*(?:이\s*)?뭐|심심|놀자|놀아|바보|멍청|재미\s*없|ㅋㅋ|ㅎㅎ|장난)/i;

const ACTION_VERB =
  /(?:가야|갈\s*거|할\s*거|만날|볼\s*거|저장|등록|예약|일정|약속|길찾|네비|지도|맛집|쇼핑|검색|찾아|알려|열어|추천|캡처|티켓|주소|연락|전화|일정\s*잡)/i;

const ACTION_ENTITY =
  /https?:\/\/|010[-\s]?\d{4}[-\s]?\d{4}|갤러리아|스타벅스|둔산|역삼|맛집|카페/i;

const SCHEDULE_CUE =
  /(?:내일|모레|오늘\s*(?:오전|오후)?\s*\d{1,2}\s*시|\d{1,2}:\d{2}|일정|약속|미팅|회의)/i;

export function detectTone(message: string): ResponseTone {
  const trimmed = message.trim();
  if (!trimmed) {
    return "DEFAULT";
  }
  return WITTY_CUE.test(trimmed) ? "WITTY" : "DEFAULT";
}

export function buildToneInstructionLine(tone: ResponseTone): string {
  return tone === "WITTY"
    ? "유머러스하고 위트 있게 대응하라. 버튼·확인 문구도 대화의 연장선으로."
    : "효율적이고 간결하게 대응하라.";
}

function hasHardActionSignal(message: string): boolean {
  return (
    ACTION_VERB.test(message) ||
    ACTION_ENTITY.test(message) ||
    SCHEDULE_CUE.test(message) ||
    /https?:\/\//.test(message) ||
    /010[-\s]?\d{4}[-\s]?\d{4}/.test(message)
  );
}

/**
 * Derived mode — Kernel execution_mode is authoritative when present.
 */
export function deriveOrchestratorMode(
  message: string,
  route: IntentRoute
): IntentRouterDecision {
  const trimmed = message.trim();
  const tone = detectTone(trimmed);

  if (!trimmed) {
    return { mode: "conversation", reason: "빈 입력 → 대화 모드", tone };
  }

  if (route.execution_mode) {
    return {
      mode: route.execution_mode,
      reason: `kernel execution_mode=${route.execution_mode}`,
      tone,
    };
  }

  if (route.micro_intent === "CLOSE") {
    return {
      mode: "conversation",
      reason: "micro_intent=CLOSE → 짧은 마무리, 추가 질문 금지",
      tone,
    };
  }

  if (route.micro_intent === "PASSIVE_STATE") {
    return {
      mode: "conversation",
      reason: "micro_intent=PASSIVE_STATE → 상태 유지, turn pressure 없음",
      tone,
    };
  }

  if (route.micro_intent === "ACK") {
    return {
      mode: "conversation",
      reason: "micro_intent=ACK → 수신 확인, 추가 질문 금지",
      tone,
    };
  }

  if (route.micro_intent === "DIRECT_QUERY") {
    return {
      mode: "action",
      reason: "micro_intent=DIRECT_QUERY → 즉시 fetch/검색",
      tone,
    };
  }

  if (route.micro_intent === "CONTINUE" && route.stability_score >= 0.5 && !hasHardActionSignal(trimmed)) {
    return {
      mode: "conversation",
      reason: "micro_intent=CONTINUE + 안정 맥락 → 대화 모드",
      tone,
    };
  }

  if (isConversationalOnlyMessage(trimmed)) {
    return { mode: "conversation", reason: "인사·잡담·감정 표현 → 대화 모드", tone };
  }

  if (isAiIntentUtterance(trimmed)) {
    return { mode: "conversation", reason: "AI intent 질문 → 대화 모드", tone };
  }

  if (
    route.intent_type === "CONTINUE" &&
    route.stability_score >= 0.45 &&
    (route.turn_pressure ?? 0.5) >= 0.35 &&
    !hasHardActionSignal(trimmed)
  ) {
    return {
      mode: "conversation",
      reason: "CONTINUE + stability → 대화 모드",
      tone,
    };
  }

  if (hasHardActionSignal(trimmed)) {
    return {
      mode: "action",
      reason: "실행/일정/장소 신호 → JSON 액션 모드",
      tone,
    };
  }

  if (route.intent_type === "NEW_TASK" && route.requires_context_switch && route.stability_score < 0.4) {
    return {
      mode: "conversation",
      reason: "NEW_TASK 전환 구간 — 먼저 대화로 정렬",
      tone,
    };
  }

  return { mode: "conversation", reason: "기본 대화 모드", tone };
}

/** @deprecated use deriveOrchestratorMode(message, route) */
export function classifyIntentRouter(
  message: string,
  options?: { intentRoute?: IntentRoute }
): IntentRouterDecision {
  if (options?.intentRoute) {
    return deriveOrchestratorMode(message, options.intentRoute);
  }

  const trimmed = message.trim();
  const tone = detectTone(trimmed);
  if (!trimmed) {
    return { mode: "conversation", reason: "빈 입력 → 대화 모드", tone };
  }
  if (hasHardActionSignal(trimmed)) {
    return { mode: "action", reason: "실행 신호 → JSON 액션 모드", tone };
  }
  return { mode: "conversation", reason: "route 없음 — 대화 모드", tone };
}

function normalizeWittyButtons(raw: unknown): WittyButtonWire[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const buttons = raw
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      const item = row as Record<string, unknown>;
      if (typeof item.label !== "string" || typeof item.action !== "string") {
        return null;
      }
      return { label: item.label.trim(), action: item.action.trim() };
    })
    .filter((row): row is WittyButtonWire => Boolean(row?.label && row?.action));

  return buttons.length > 0 ? buttons.slice(0, 4) : undefined;
}

export function parseWittyConversationJson(raw: string): WittyConversationWire | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const persona_message =
      typeof parsed.persona_message === "string" ? parsed.persona_message.trim() : "";
    const witty_buttons = normalizeWittyButtons(parsed.witty_buttons);

    if (!persona_message || !witty_buttons?.length) {
      return null;
    }

    const thought = typeof parsed.thought === "string" ? parsed.thought.trim() : undefined;

    return { thought, persona_message, witty_buttons };
  } catch {
    return null;
  }
}

export function detectActionIntent(message: string): boolean {
  return hasHardActionSignal(message);
}

export function resolveOrchestratorMode(message: string): OrchestratorMode {
  return classifyIntentRouter(message).mode;
}

export function parseConversationalAssistantText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { summary?: string; text?: string };
      if (typeof parsed.summary === "string") {
        return parsed.summary.trim();
      }
      if (typeof parsed.text === "string") {
        return parsed.text.trim();
      }
    } catch {
      // fall through
    }
  }

  return trimmed.replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/, "").trim();
}
