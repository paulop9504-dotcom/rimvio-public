import { buildChatGptPromptHref } from "@/lib/actions/search-urls";

export const MEDICAL_SUMMARY_LABELS = {
  drug: "약물",
  dosage: "복용",
  caution: "주의",
  question: "확인",
} as const;

export const MEDICAL_SUMMARY_AI_INSTRUCTIONS = `당신은 처방전·약 봉투·의약품 안내문을 쉽게 풀어 설명하는 전문가입니다.
학술 요약이 아니라 '복약 안내'만 제공하세요.

[출력 형식]
💊 약물: 핵심 약 이름·용도 1~2줄
⏰ 복용: 1일 횟수·시간·식전/식후 등 복용법
⚠️ 주의: 부작용·금기·함께 피할 것 2~3개
? 확인: 사용자가 의사·약사에게 꼭 확인할 질문 1개

[제약]
- 시험용 요약·학술 분석·철학적 해석 금지
- 확실하지 않은 용량은 추측하지 말고 "확인 필요"라고 표시
- 짧고 쉬운 한국어로 작성`;

export function buildMedicalSummaryPrompt(query: string, ocrText: string) {
  const excerpt = ocrText.trim().slice(0, 1600);
  const topic = query.trim() || "약 정보";

  return buildChatGptPromptHref(
    `${MEDICAL_SUMMARY_AI_INSTRUCTIONS}\n\n[분석할 텍스트]\n주제: ${topic}\n---\n${excerpt}`
  );
}

export function buildMedicalSummaryPlainText(input: {
  title: string;
  ocrText: string;
}) {
  const excerpt = input.ocrText.trim().slice(0, 280);
  return [
    "── 복약 포스트잇 ──",
    input.title,
    "💊 약물: OCR 확인 중 — 📝 복용 요약으로 AI 보강",
    excerpt ? `⏰ 복용: ${excerpt.slice(0, 120)}…` : "⏰ 복용: 라벨에서 복용법 확인",
    "⚠️ 주의: 알레르기·다른 약과 상호작용 확인",
    "? 확인: 이 약을 지금 복용해도 되는지 약사에게 문의",
  ].join("\n");
}
