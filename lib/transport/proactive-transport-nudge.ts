import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";

const PROACTIVE_WINDOW_MINUTES = 20;

function parseTimeMinutes(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1]!, 10) * 60 + Number.parseInt(match[2]!, 10);
}

function nowMinutes(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

export type ProactiveTransportNudge = {
  message: string;
  scheduleTask: string;
  scheduleTime: string;
  routeHint: string;
  location: string;
};

export function evaluateProactiveTransportNudge(input: {
  existingSchedule: ExistingScheduleInput;
  now?: Date;
}): ProactiveTransportNudge | null {
  const now = input.now ?? new Date();
  const current = nowMinutes(now);

  for (const task of input.existingSchedule) {
    const target = parseTimeMinutes(task.time);
    if (target == null) {
      continue;
    }

    const delta = target - current;
    if (delta < 0 || delta > PROACTIVE_WINDOW_MINUTES) {
      continue;
    }

    if (!/(회의|미팅|약속|병원|수업|면접|약속|일정)/.test(task.task)) {
      continue;
    }

    return {
      message: `${task.time} ${task.task} 가시려면 지금 102번 버스 타셔야 해요. 3분 뒤 도착합니다.`,
      scheduleTask: task.task,
      scheduleTime: task.time,
      routeHint: "102",
      location: "대전역 3번 출구",
    };
  }

  return null;
}
