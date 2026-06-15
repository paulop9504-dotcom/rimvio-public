import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  RIMVIO_CONVERSATION_LINES,
  isEmotionalConcern,
  isSadanAnalysisRequest,
} from "@/lib/action-chat/rimvio-persona";

const PURE_GREETING =
  /^(?:ㅎㅇ|하이|헬로|hello|hi|hey|안녕(?:하세요|히|하세용|하십니까)?|반가(?:워|워요|습니다)|good\s*(?:morning|evening|night)|굿모닝|굿밤|뭐해|잘\s*지내)(?:[!?.~ㅋㅎ\s]*)?$/iu;

const PURE_THANKS =
  /^(?:고마워|고맙(?:습니다|어요)|감사(?:합니다|해요)|thank\s*(?:you|s|u)|thx|ㄱㅅ)(?:[!?.~ㅋㅎ\s]*)?$/iu;

const PURE_BYE =
  /^(?:잘\s*가|바이|bye|goodbye|ㅂㅂ|ㅃㅃ|또\s*봐|see\s*ya)(?:[!?.~ㅋㅎ\s]*)?$/iu;

const HELP_OR_CAPABILITIES =
  /^(?:뭐\s*할\s*수\s*있|뭐\s*해\s*줄|도와\s*줄|help|도움|사용\s*법|어떻게\s*써)(?:[!?.~ㅋㅎ\s]*)?$/iu;

function hasActionIntent(message: string) {
  return /https?:\/\/|지도|맛집|길찾|네비|검색|쇼핑|가격|링크|예약|번역|사진|캡처|찾아|알려|열어|추천|비교|영수증|티켓|주소/i.test(
    message
  );
}

export function isConversationalOnlyMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }

  if (hasActionIntent(trimmed)) {
    return false;
  }

  if (isSadanAnalysisRequest(trimmed)) {
    return true;
  }

  if (
    trimmed.length <= 32 &&
    (PURE_GREETING.test(trimmed) ||
      PURE_THANKS.test(trimmed) ||
      PURE_BYE.test(trimmed) ||
      HELP_OR_CAPABILITIES.test(trimmed))
  ) {
    return true;
  }

  if (trimmed.length <= 120 && isEmotionalConcern(trimmed)) {
    return true;
  }

  return false;
}

function sadanFallbackReply(concern: string) {
  const topic = concern.replace(/사단.*?조언|관점.*?답|분석.*?줘/gi, "").trim().slice(0, 40);
  const subject = topic ? `${topic} 일` : "이 일";

  return [
    `측은—${subject}에 마음이 무거우시겠어요.`,
    "수오—스스로를 너무 몰아붙이진 않으셨는지 돌아보세요.",
    "사양—상대나 상황에 한 번 양보할 여지를 남겨보세요.",
    "시비—지금 할 수 있는 가장 작은 한 걸 정해 보세요.",
  ].join(" ");
}

export function orchestrateConversation(input: {
  message: string;
  linkTitle?: string | null;
}): OrchestratorResult | null {
  const trimmed = input.message.trim();
  if (!isConversationalOnlyMessage(trimmed)) {
    return null;
  }

  const placeHint = input.linkTitle?.trim();

  if (isSadanAnalysisRequest(trimmed)) {
    return {
      summary: sadanFallbackReply(trimmed),
      actions: [],
      source: "conversation",
    };
  }

  if (isEmotionalConcern(trimmed) && !PURE_GREETING.test(trimmed)) {
    return {
      summary: RIMVIO_CONVERSATION_LINES.tired,
      actions: [],
      source: "conversation",
    };
  }

  if (PURE_THANKS.test(trimmed)) {
    return {
      summary: RIMVIO_CONVERSATION_LINES.thanks,
      actions: [],
      source: "conversation",
    };
  }

  if (PURE_BYE.test(trimmed)) {
    return {
      summary: RIMVIO_CONVERSATION_LINES.bye,
      actions: [],
      source: "conversation",
    };
  }

  if (HELP_OR_CAPABILITIES.test(trimmed)) {
    return {
      summary: RIMVIO_CONVERSATION_LINES.help,
      actions: [],
      source: "conversation",
    };
  }

  if (placeHint) {
    return {
      summary: RIMVIO_CONVERSATION_LINES.greetingWithContext(placeHint),
      actions: [],
      source: "conversation",
    };
  }

  return {
    summary: RIMVIO_CONVERSATION_LINES.greeting,
    actions: [],
    source: "conversation",
  };
}
