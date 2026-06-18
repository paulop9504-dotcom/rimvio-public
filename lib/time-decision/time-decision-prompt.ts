import { classifyTimeExpression } from "@/lib/time-decision/classify-time-expression";
import { parseAbsoluteTimeFromText } from "@/lib/time-decision/parse-absolute-time";
import { TIME_NORMALIZATION_PROTOCOL } from "@/lib/time/normalize-time";

/** System prompt block — Time Decision Logic for LLM turns. */
export function buildTimeDecisionPromptBlock(input: {
  message: string;
  referenceDate: string;
  currentTime?: string;
}): string | null {
  const analysis = classifyTimeExpression(input.message);
  if (analysis.kind === "none") {
    return null;
  }

  const now =
    input.currentTime ??
    new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const lines = [
    TIME_NORMALIZATION_PROTOCOL,
    "",
    "# [Time Decision Logic]",
    "사용자 입력에 시간 정보가 있으면 아래 순서를 반드시 따른다 (Missing/장소 확인보다 우선).",
    "",
    "## 0. 시간 정규화 (필수 선행)",
    '- 입력 텍스트 → normalize → HH:MM(24h) → 툴 매개변수.',
    '- "15시 30분" → 15:30. 15를 3시/오후 3시로 변환 금지.',
    "",
    "## 1. 시간 표현 분류",
    '- **상대적(Relative)**: "~뒤", "~후" → 즉시 [타이머/카운트다운 모드]. Current Time + offset.',
    '- **절대적(Absolute)**: "15시 30분", "13:00", "오후 1시" → [일정 저장 모드]이지만 바로 저장하지 말고 2단계 검증.',
    "",
    "## 2. 절대적 시간 — 모호성 검증 (필수)",
    `- 현재 시각: ${now} (기준일 ${input.referenceDate})`,
  ];

  if (analysis.kind === "absolute") {
    const parsed = parseAbsoluteTimeFromText({
      message: input.message,
      referenceDate: input.referenceDate,
    });
    if (parsed) {
      lines.push(
        `- 파싱된 시각: ${parsed.clockLabel} (${parsed.iso})`,
        parsed.isPastToday
          ? "- 상태: **오늘 기준 과거** → '오늘 1시인가요, 내일 1시인가요?' 되물어라."
          : "- 상태: **오늘 기준 미래** → '일정 저장 vs 타이머' 의도를 반드시 확인하라."
      );
    }
  } else {
    lines.push("- 상태: **상대적 시간** → Missing 탐색 전에 카운트다운/알람을 우선 제안하라.");
  }

  lines.push(
    "",
    "## 3. 액션 결정",
    "- 사용자 확인 후 타이머 또는 캘린더 알림을 설정한다.",
    "- 지점명 등이 없어도 **'시간은 이미 확정됨'**을 summary/thought에 명시한 뒤 장소만 추가로 물어라.",
    "- 절대적 시간에서 Missing: 장소만 묻고, 시간 슬롯은 유지하라.",
    "- '1시'만 있고 과거면 지레짐작 저장 금지 — today/tomorrow 분기 필수."
  );

  return lines.join("\n");
}
