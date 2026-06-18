import type { AiIntentCategory } from "@/lib/action-chat/classify-ai-intent-utterance";

/** Representative utterances for the 6 AI question intent families. */
export const AI_INTENT_PLAYBOOK: Record<AiIntentCategory, readonly string[]> = {
  INFO: [
    "이거 뭐야?",
    "○○ 뜻이 뭐야?",
    "왜 이런 거야?",
    "어떻게 되는 거야?",
    "차이점이 뭐야?",
    "쉽게 설명해줘",
    "예시 들어줘",
  ],
  HOW_TO: [
    "어떻게 해?",
    "만드는 방법 알려줘",
    "시작하려면 뭐부터 해야 돼?",
    "단계별로 알려줘",
    "초보 기준으로 설명해줘",
    "설정 어떻게 해?",
  ],
  DECISION: [
    "A vs B 뭐가 좋아?",
    "이거 사도 돼?",
    "이 방향 맞아?",
    "추천해줘",
    "지금 뭐 하는 게 좋을까?",
    "이거 위험해?",
  ],
  CREATION: [
    "글 써줘",
    "이메일 써줘",
    "대본 만들어줘",
    "아이디어 줘",
    "이름 지어줘",
    "기획해줘",
    "요약해줘",
  ],
  COUNSELING: [
    "이 상황 어떻게 해야 돼?",
    "인간관계 문제",
    "연애 상담",
    "회사 문제",
    "스트레스 어떻게 해?",
    "내가 잘하고 있는 거야?",
  ],
  CURIOSITY: [
    "너는 어떻게 작동해?",
    "AI가 인간을 대체해?",
    "미래 어떻게 돼?",
    "너는 생각 있어?",
    "GPT랑 다른 모델 차이 뭐야?",
  ],
};

export const AI_INTENT_CATEGORIES = Object.keys(AI_INTENT_PLAYBOOK) as AiIntentCategory[];
