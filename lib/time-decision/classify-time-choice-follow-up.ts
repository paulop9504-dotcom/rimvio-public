import type { TimeChoiceOption } from "@/lib/time-decision/types";

/** User already picked calendar / timer / both — do not re-show ASK_TIME_CHOICE. */
export function classifyTimeChoiceFollowUp(message: string): TimeChoiceOption["mode"] | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  if (
    /일정\s*(?:저장|잡|등록).{0,16}타이머|저장하고\s*타이머|타이머도\s*맞|둘\s*다/u.test(
      trimmed
    )
  ) {
    return "both";
  }

  if (/까지\s*타이머|타이머\s*(?:맞|설|켜)|카운트다운/u.test(trimmed)) {
    return "countdown";
  }

  if (/일정\s*(?:저장|잡|등록)|캘린더/u.test(trimmed)) {
    return "calendar";
  }

  if (/^오늘\s+\d/u.test(trimmed)) {
    return "today";
  }

  if (/^내일\s+\d/u.test(trimmed)) {
    return "tomorrow";
  }

  return null;
}
