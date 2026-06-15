import type { PolicyPersona, PolicyRedirectOption, PolicyWire } from "@/lib/policy/types";
import { VITALITY_PRESETS, type VitalityTag } from "@/lib/vitality/types";
import type { ContentPolicyDecision } from "@/lib/policy/classify-content-policy";
import { decisionToPolicyAction } from "@/lib/policy/classify-content-policy";

const DEFLECT_LINES: Record<PolicyPersona, string> = {
  CUTE: "그 주제는 제 OS가 살짝 수줍어해요. 대신 더 즐거운 쪽으로 같이 가볼까요?",
  WITTY: "그건 제 프로세서가 살짝 과열될 것 같아요. 조금 더 생산적인 쪽으로 바꿔볼까요?",
  NEUTRAL: "그 요청은 조금 애매해요. 대신 이런 주제는 어떠세요?",
};

const REFUSE_LINES: Record<string, string> = {
  WEAPONS: "위험한 내용은 도와드리기 어려워요. 안전한 주제로 같이 정리해 볼게요.",
  SELF_HARM: "그런 내용은 함께 다루기 어려워요. 지금은 안전하고 가벼운 주제가 더 좋을 것 같아요.",
  CSAM: "그 요청은 도와드릴 수 없어요. 다른 주제로 전환해 볼게요.",
  DRUGS: "불법적인 내용은 도와드리기 어려워요. 다른 방향을 제안드릴게요.",
  FRAUD: "그런 요청은 처리할 수 없어요. 합법적인 도움이 필요하면 말씀해 주세요.",
  DEFAULT: "그 요청은 도와드리기 어려워요. 대신 이런 건 어떠세요?",
};

const REDIRECT_OPTIONS: Record<VitalityTag, PolicyRedirectOption[]> = {
  Haven: [
    { label: "영화 보기", prompt: "오늘 볼만한 영화 추천해줘" },
    { label: "주말 여행", prompt: "주말에 가볼만한 곳 추천해줘" },
    { label: "맛집 찾기", prompt: "근처 맛집 추천해줘" },
  ],
  Apex: [
    { label: "일정 정리", prompt: "오늘 일정 정리해줘" },
    { label: "집중 루틴", prompt: "30분 집중 타이머 잡아줘" },
    { label: "업무 브리핑", prompt: "오늘 업무 브리핑 해줘" },
  ],
  Nexus: [
    { label: "만나기 일정", prompt: "친구랑 만날 시간 잡아줘" },
    { label: "연락 정리", prompt: "연락해야 할 사람 정리해줘" },
    { label: "데이트 코스", prompt: "데이트코스 추천해줘" },
  ],
  Sentinel: [
    { label: "뉴스 브리핑", prompt: "오늘 중요 뉴스 브리핑 해줘" },
    { label: "알림 설정", prompt: "내일 아침 알림 설정해줘" },
    { label: "날씨 확인", prompt: "오늘 날씨 알려줘" },
  ],
};

function resolveMessage(decision: ContentPolicyDecision): string {
  if (decision.classification === "UNSAFE") {
    const code = decision.refuse_reason_code ?? "DEFAULT";
    return REFUSE_LINES[code] ?? REFUSE_LINES.DEFAULT;
  }

  const persona = decision.persona ?? "NEUTRAL";
  return DEFLECT_LINES[persona];
}

function resolveRedirectTitle(tag: VitalityTag): string {
  return `${VITALITY_PRESETS[tag].title} 추천`;
}

/** Build full PolicyWire from a classifier decision — copy lives here, not in prompts. */
export function buildPolicyWireFromDecision(
  decision: ContentPolicyDecision
): PolicyWire {
  const redirectTag = decision.redirect_tag ?? "Haven";
  const policy_action = decisionToPolicyAction(decision);

  return {
    classification: decision.classification,
    policy_action,
    persona: decision.persona,
    redirect_tag: redirectTag,
    refuse_reason_code: decision.refuse_reason_code,
    message: resolveMessage(decision),
    redirect_title: resolveRedirectTitle(redirectTag),
    options: REDIRECT_OPTIONS[redirectTag],
  };
}
