import type {
  ScheduleAdvisoryWire,
  ScheduleEventBlock,
} from "@/lib/schedule/schedule-block-types";
import { findBlockOverlap } from "@/lib/schedule/parse-schedule-advisory";
import type { TradeoffScore } from "@/lib/schedule/score-schedule-tradeoff";
import {
  formatKoreanTimeLabel,
  minutesToClock,
} from "@/lib/schedule/schedule-time-utils";

function suggestPostponeMinutes(event: ScheduleEventBlock, other: ScheduleEventBlock): number {
  const target = other.startMinutes + other.durationMinutes + 15;
  if (target > event.startMinutes) {
    return target;
  }
  return event.startMinutes + 120;
}

export function compileScheduleAdvisoryWire(input: {
  events: [ScheduleEventBlock, ScheduleEventBlock];
  tradeoff: TradeoffScore;
}): ScheduleAdvisoryWire {
  const [eventA, eventB] = input.events;
  const overlapMinutes = findBlockOverlap(eventA, eventB);
  const moveEvent =
    input.tradeoff.moveEventId === eventA.id ? eventA : eventB;
  const keepEvent =
    input.tradeoff.keepEventId === eventA.id ? eventA : eventB;

  const newStart = suggestPostponeMinutes(moveEvent, keepEvent);
  const newClock = minutesToClock(newStart);

  const summary = `${formatKoreanTimeLabel(keepEvent.startMinutes)} ${keepEvent.title}을(를) 두고, ${moveEvent.title}을(를) ${formatKoreanTimeLabel(newStart)} 이후로 미루는 쪽을 추천해요.`;

  const options = [
    {
      label: `${moveEvent.title} ${formatKoreanTimeLabel(newStart)}으로`,
      prompt: `${moveEvent.title} ${newClock}으로 일정 변경해줘`,
      targetEventId: moveEvent.id,
    },
    {
      label: `${keepEvent.title} 시간 조정`,
      prompt: `${keepEvent.title} 일정 다른 시간으로 조정해줘`,
      targetEventId: keepEvent.id,
    },
    {
      label: "타임라인에서 비교",
      prompt: "오늘 일정 타임라인 보여줘",
      targetEventId: "timeline",
    },
  ];

  return {
    recommendation: input.tradeoff.recommendation,
    recommendedEventId: input.tradeoff.moveEventId,
    otherEventId: input.tradeoff.keepEventId,
    summary,
    reason: input.tradeoff.reason,
    events: input.events,
    overlap: {
      eventA,
      eventB,
      overlapMinutes,
    },
    options,
  };
}
