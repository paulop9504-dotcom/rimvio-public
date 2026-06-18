/** Canonical 시험 포스트잇 format — OCR receipt + AI prompt share this spec. */
export const EXAM_POSTIT_LABELS = {
  context: "맥락",
  memorize: "외울 것",
  keyword: "키워드",
  exam: "출제 각",
} as const;

export const EXAM_POSTIT_ICONS = {
  context: "📍",
  memorize: "◆",
  keyword: "◆",
  exam: "?",
} as const;

export const EXAM_POSTIT_AI_INSTRUCTIONS = `당신은 복잡한 학술적 텍스트를 핵심만 추출하여 시험 공부용 '포스트잇 요약'으로 만드는 전문가입니다.
제공하는 텍스트를 분석하여 아래 형식에 맞춰 정리해 주세요.

[요약 형식]
📍 맥락: 텍스트 전체의 핵심 주제와 논리적 흐름을 1~2문장으로 요약 (핵심 개념 포함)
◆ 외울 것: 반드시 암기해야 할 주요 용어 1~2가지 (용어: 한 줄 정의)
◆ 키워드: 문맥 이해에 중요한 고유명사·인물·이론명 2~3개
? 출제 각: 저자의 핵심 주장(Main Claim)을 단 한 줄의 질문 또는 명제로 정리

[제약 사항]
- 최대한 간결하고 압축적으로 작성할 것.
- 텍스트의 본질적인 의미를 왜곡하지 말 것.
- 텍스트에서 가장 중요한 인사이트를 우선적으로 반영할 것.
- 위 형식과 이모지만 사용하고, 다른 섹션은 추가하지 말 것.`;

export function buildExamPostItPrompt(query: string, ocrText: string) {
  const excerpt = ocrText.trim().slice(0, 2000);
  const topic = query.trim() || "학습 캡처";
  const prompt = `${EXAM_POSTIT_AI_INSTRUCTIONS}\n\n[분석할 텍스트]\n주제: ${topic}\n---\n${excerpt}`;

  return `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`;
}
