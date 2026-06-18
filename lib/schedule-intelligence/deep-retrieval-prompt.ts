import type { ScheduleQueryAnalysis } from "@/lib/schedule-intelligence/types";

/** System prompt — Deep Retrieval Protocol for schedule lookup turns. */
export function buildDeepRetrievalPromptBlock(input: {
  message: string;
  analysis?: ScheduleQueryAnalysis | null;
}): string | null {
  if (
    !/(?:일정|스케줄|캘린더|태스크|할\s*일|약속|미팅|언제|뭐|불러|알려)/u.test(
      input.message
    )
  ) {
    return null;
  }

  return [
    "# [Deep Retrieval Protocol]",
    "일정·태스크 질의 시 아래 4단계 검색 전략을 **반드시** 따른다 (Missing/장소 확인보다 우선).",
    "",
    "## 1단계 Strict Search (정확 검색)",
    "- 사용자 키워드와 **정확히 일치**하는 Calendar/Tasks만 반환.",
    "- 결과 0건 → 2단계.",
    "",
    "## 2단계 Loose Search (범위 확장)",
    "- 키워드 **부분 일치** 허용 (예: 치과예약 → 치과, 예약, 방문).",
    "- 말한 날짜 기준 **앞뒤 24시간**까지 확장.",
    "- 결과 0건 → 3단계.",
    "",
    "## 3단계 Source Expansion (데이터 소스 확장)",
    "- Calendar/Reminder에 없으면 **활동 로그(Activity Feed)**·**앱 내 알림 기록**을 텍스트 전수 조사.",
    "- UI 활동 로그와 API 결과가 다르면 **활동 로그 최신 상태를 우선** 신뢰.",
    "- 결과 0건 → 4단계.",
    "",
    "## 4단계 User-in-the-loop",
    '- 단정적으로 "없다"고 하지 말 것.',
    `- 반드시 다음 문구로 제안: "검색 범위 내에 등록된 일정을 찾지 못했습니다. 혹시 직접 입력해 주신 데이터인가요? 일정의 대략적인 시간과 이름을 알려주시면 바로 반영하겠습니다."`,
    "",
    "- 시간 확정 후 장소가 없으면 '시간은 확정됨'을 명시하고 장소만 추가 질문.",
  ].join("\n");
}
