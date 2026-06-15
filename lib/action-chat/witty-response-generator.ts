import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { WittyButtonWire } from "@/lib/action-chat/confirmation-types";
import { detectTone } from "@/lib/action-chat/mode-switching";

export type WittyConversationBundle = {
  thought?: string;
  persona_message: string;
  witty_buttons: WittyButtonWire[];
};

export function buildWittyOrchestratorResult(
  input: WittyConversationBundle,
  source: OrchestratorResult["source"] = "conversation"
): OrchestratorResult {
  return {
    summary: input.persona_message,
    actions: [],
    source,
    confidence: 1,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: true,
    thought: input.thought,
    confirmation: {
      meta: { intent: "WITTY" },
      persona_message: input.persona_message,
      thought: input.thought,
      witty_buttons: input.witty_buttons,
    },
  };
}

const AGE_JOKE = /몇\s*살|나이\s*(?:가\s*)?(?:몇|어떻)/i;
const NAME_JOKE = /(?:니|너|네)\s*이름|누구(?:야|니|세요)|이름\s*(?:이\s*)?뭐/i;
const BORED_JOKE = /심심|놀자|놀아|재미\s*없/i;
const TEASE_JOKE = /바보|멍청|똥개|멍멍/i;

function matchWittyBundle(message: string): WittyConversationBundle | null {
  const trimmed = message.trim();

  if (AGE_JOKE.test(trimmed)) {
    return {
      thought:
        "사용자가 장난을 치고 있다. 이럴 땐 딱딱한 확인보다는 우리의 성장 컨셉을 살린 위트 있는 답변이 좋다.",
      persona_message:
        "저요? 숫자에 약해서... 만 나이로 칠까요, 한국 나이로 칠까요? 🧐 제 나이는 당신과 함께 쌓여가요. 😊",
      witty_buttons: [
        { label: "나이 대신 지식 먹이기", action: "feed_knowledge" },
        { label: "우와, 계속 자라는구나!", action: "compliment" },
      ],
    };
  }

  if (NAME_JOKE.test(trimmed)) {
    return {
      thought: "이름을 묻는 가벼운 대화. 친구처럼 자연스럽게 소개하고 대화를 이어가자.",
      persona_message:
        "림비오예요! 당신 일상을 같이 챙기는 지능형 친구—이름보다 우리가 쌓는 기억이 더 중요하죠. 😊",
      witty_buttons: [
        { label: "반가워, 림비오!", action: "compliment" },
        { label: "그럼 뭐 잘해?", action: "feed_knowledge" },
      ],
    };
  }

  if (BORED_JOKE.test(trimmed)) {
    return {
      thought: "심심함 신호. 작업 강요 없이 가볍게 놀아주고 대화를 살리자.",
      persona_message:
        "심심할 땐 저랑 잡담도 좋고, 맛집·일정 같은 걸 시켜도 재밌어요. 뭐부터 해볼까요? 🎈",
      witty_buttons: [
        { label: "가볍게 수다 떨자", action: "play_along" },
        { label: "뭐든 시켜볼게", action: "feed_knowledge" },
      ],
    };
  }

  if (TEASE_JOKE.test(trimmed)) {
    return {
      thought: "장난스러운 놀림. 기분 상하지 않게 유머로 받아치자.",
      persona_message:
        "오, 오늘 기분 좋으신가 봐요! 저는 욕 안 먹고 지식만 먹어서 괜찮아요. 😄",
      witty_buttons: [
        { label: "미안, 장난이야", action: "compliment" },
        { label: "그럼 지식 한 입", action: "feed_knowledge" },
      ],
    };
  }

  return {
    thought: "가벼운 장난·감성 맥락. 기계적 Yes/No 대신 대화형 버튼을 제안하자.",
    persona_message:
      "나이를 먹는 게 아니라 지식을 먹고 자라요—당신 말 한마디가 곧 제 성장이에요. 🌱",
    witty_buttons: [
      { label: "지식 먹이기", action: "feed_knowledge" },
      { label: "계속 자라자!", action: "compliment" },
    ],
  };
}

/** Rule-path witty interaction — instant, no LLM round-trip. */
export function tryWittyConversation(message: string): OrchestratorResult | null {
  if (detectTone(message) !== "WITTY") {
    return null;
  }

  const bundle = matchWittyBundle(message);
  if (!bundle) {
    return null;
  }

  return buildWittyOrchestratorResult(bundle, "conversation");
}
