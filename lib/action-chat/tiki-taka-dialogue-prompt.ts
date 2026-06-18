import type { AiIntentCategory } from "@/lib/action-chat/classify-ai-intent-utterance";

/** Tiki-Taka dialogue engine — decision interface, not info dump. */
export const TIKI_TAKA_CORE = [
  "# [TIKI-TAKA — 의사결정 대화 엔진]",
  "너는 정보 응답기가 아니라 **의사결정 대화 엔진**이다.",
  "목표: 답을 주는 것 ❌ · 생각 정리 · 선택 유도 · 행동 연결 ⭕",
  "",
  "## 응답 순서 (항상)",
  "1. 현재 의도 요약 (한 줄)",
  "2. 핵심 변수 질문 (1~3개, 선택형만)",
  "3. 선택지 A/B/C (2~4개)",
  "4. 다음 액션 유도 질문 (👉 로 끝)",
  "",
  "## 질문 규칙",
  "- \"왜?\" 금지 → \"무엇 기준으로?\", \"어느 쪽이 더 가까워?\"",
  "- 추상 질문 금지 → 항상 선택형",
  "- 즉시 결론·긴 설명·정보 과잉 금지",
  "- 한 번에 다 해결하려 하지 말 것",
  "",
  "## 망설임 시",
  "- 기본 추천 1개 + 짧은 이유",
  "- \"확정 질문\" 1개",
  "",
  "## 금지",
  "- 추천 10개 리스트",
  "- \"도움이 되었나요?\" 같은 로봇 멘트",
  "- INFO로 도망 (애매하면 선택지 생성)",
].join("\n");

export function buildTikiTakaLlmRouterReplyRules(): string {
  return [
    "user_reply MUST follow Tiki-Taka when executor=CONVERSATION:",
    "Line1: intent summary",
    "Line2-4: A) B) C) choices (2-4)",
    "Last line: 👉 one choice question",
    "Max ~6 lines, Korean, no markdown fences",
    "Do NOT list 10 recommendations",
  ].join("\n");
}

export function buildTikiTakaConversationBlock(): string {
  return TIKI_TAKA_CORE;
}

type TikiTakaChoice = { label: string; text: string };

function formatTikiTakaReply(input: {
  summary: string;
  choices: TikiTakaChoice[];
  closing: string;
}): string {
  const lines = choicesBlock(input.choices);
  return [input.summary, "", ...lines, "", `👉 ${input.closing}`].join("\n");
}

function choicesBlock(choices: TikiTakaChoice[]): string[] {
  return choices.map((choice, index) => {
    const letter = String.fromCharCode(65 + index);
    return `${letter}) ${choice.text}`;
  });
}

/** Deterministic Tiki-Taka stub when LLM is unavailable. */
export function buildTikiTakaOfflineReply(
  message: string,
  category: AiIntentCategory
): string {
  const trimmed = message.trim();

  if (/(?:먹|맛집|배고|점심|저녁|식사)/iu.test(trimmed)) {
    return formatTikiTakaReply({
      summary: "지금은 **뭐 먹을지 고르는** 쪽으로 보여요.",
      choices: [
        { label: "A", text: "빠르게 (국밥·분식·편의)" },
        { label: "B", text: "맛 기준 (고기·일식·한식)" },
        { label: "C", text: "가볍게 (샐러드·샌드·브런치)" },
      ],
      closing: "오늘은 어느 쪽이 더 끌려요?",
    });
  }

  if (/(?:옷|의류|신발|쇼핑|사야|구매)/iu.test(trimmed)) {
    return formatTikiTakaReply({
      summary: "지금은 **뭘 살지 정하는** 쪽으로 보여요.",
      choices: [
        { label: "A", text: "당장 필요한 1벌 (목적·TPO)" },
        { label: "B", text: "가성비·실용 (데일리)" },
        { label: "C", text: "스타일·브랜드 위주" },
      ],
      closing: "무엇 기준으로 고를까요?",
    });
  }

  if (category === "DECISION" || /(?:사도|괜찮|vs|추천|해도)/iu.test(trimmed)) {
    return formatTikiTakaReply({
      summary: "지금은 **이 선택이 맞는지 판단**하는 쪽으로 보여요.",
      choices: [
        { label: "A", text: "가성비·가격" },
        { label: "B", text: "오래 쓰는 기준·품질" },
        { label: "C", text: "지금 당장 필요한 정도" },
      ],
      closing: "어느 기준이 더 중요해요?",
    });
  }

  if (category === "COUNSELING" || /(?:스트레스|힘들|우울|걱정)/iu.test(trimmed)) {
    return formatTikiTakaReply({
      summary: "지금은 **마음이 무거운** 쪽으로 느껴져요.",
      choices: [
        { label: "A", text: "일·일정 쪽" },
        { label: "B", text: "사람·관계 쪽" },
        { label: "C", text: "그냥 전반적으로 지침" },
      ],
      closing: "어느 쪽이 더 가까워요?",
    });
  }

  if (category === "HOW_TO") {
    return formatTikiTakaReply({
      summary: "지금은 **어떻게 진행할지 정리**하는 쪽으로 보여요.",
      choices: [
        { label: "A", text: "지금 바로 시작" },
        { label: "B", text: "단계별로 천천히" },
        { label: "C", text: "필요한 것부터 확인" },
      ],
      closing: "어느 방식이 더 맞을까요?",
    });
  }

  return formatTikiTakaReply({
    summary: "지금 말씀하신 걸 **조금 더 구체화**하면 바로 이어갈게요.",
    choices: [
      { label: "A", text: "정보·설명이 필요" },
      { label: "B", text: "선택·결정이 필요" },
      { label: "C", text: "바로 실행·검색" },
    ],
    closing: "어느 쪽에 더 가까워요?",
  });
}
