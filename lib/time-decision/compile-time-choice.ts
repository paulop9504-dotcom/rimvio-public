import type { ParsedAbsoluteTime, TimeChoiceWire } from "@/lib/time-decision/types";
import { extractTaskLabelFromMessage } from "@/lib/time-decision/extract-task-label";

function shiftIsoByDays(iso: string, days: number): string {
  const base = new Date(iso);
  base.setDate(base.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}:${pad(base.getSeconds())}`;
}

export function compilePastTimeChoice(input: {
  message: string;
  parsed: ParsedAbsoluteTime;
  missingPlace?: boolean;
}): TimeChoiceWire {
  const task = extractTaskLabelFromMessage(input.message);
  const tomorrowIso = shiftIsoByDays(input.parsed.iso, 1);

  return {
    action: "ASK_TIME_CHOICE",
    time_locked: false,
    datetime_iso: input.parsed.iso,
    task_label: task,
    headline: "시간 확인",
    empathy_line: `입력하신 ${input.parsed.clockLabel}은(는) 이미 지난 시간이에요. 오늘 ${input.parsed.clockLabel}을(를) 말씀하신 건가요, 아니면 내일 ${input.parsed.clockLabel}인가요?`,
    missing_place_note: input.missingPlace
      ? "시간은 아직 확정 전이에요. 장소는 확인 후 이어서 잡을게요."
      : undefined,
    options: [
      {
        label: `오늘 ${input.parsed.clockLabel}`,
        prompt: `오늘 ${input.parsed.clockLabel} ${task}으로 진행할게`,
        mode: "today",
      },
      {
        label: `내일 ${input.parsed.clockLabel}`,
        prompt: `내일 ${input.parsed.clockLabel} ${task}으로 진행할게`,
        mode: "tomorrow",
      },
    ],
  };
}

export function compileFutureTimeChoice(input: {
  message: string;
  parsed: ParsedAbsoluteTime;
  missingPlace?: boolean;
}): TimeChoiceWire {
  const task = extractTaskLabelFromMessage(input.message);

  return {
    action: "ASK_TIME_CHOICE",
    time_locked: true,
    datetime_iso: input.parsed.iso,
    task_label: task,
    headline: "시간 확인",
    empathy_line: `${input.parsed.clockLabel} ${task}${input.missingPlace ? "" : "으로"} 진행할까요? 일정만 저장할지, ${input.parsed.clockLabel}까지 타이머를 맞출지 골라 주세요.`,
    missing_place_note: input.missingPlace
      ? `시간은 ${input.parsed.clockLabel}으로 확정됐어요. 지점명은 확인 후 이어서 잡을게요.`
      : undefined,
    options: [
      {
        label: `${input.parsed.clockLabel} 일정 저장`,
        prompt: `${input.parsed.clockLabel} ${task} 일정 저장해줘`,
        mode: "calendar",
      },
      {
        label: `${input.parsed.clockLabel}까지 타이머`,
        prompt: `${input.parsed.clockLabel} ${task}까지 타이머 맞춰줘`,
        mode: "countdown",
      },
      {
        label: "둘 다",
        prompt: `${input.parsed.clockLabel} ${task} 일정 저장하고 타이머도 맞춰줘`,
        mode: "both",
      },
    ],
  };
}

export function compileRelativeCountdownSummary(input: {
  message: string;
  datetimeIso: string;
}): string {
  const target = new Date(input.datetimeIso);
  const remainingMs = target.getTime() - Date.now();
  const minutes = Math.max(1, Math.round(remainingMs / 60_000));
  const task = extractTaskLabelFromMessage(input.message);
  return `${minutes <= 90 ? `${minutes}분` : `${Math.round(minutes / 60)}시간`} 뒤 ${task} — 타이머 모드로 바로 맞출게요.`;
}
