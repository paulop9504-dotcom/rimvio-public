import type { ScheduleEventBlock } from "@/lib/schedule/schedule-block-types";
import type { ScheduleIntelligenceContext } from "@/lib/schedule-intelligence/types";
import {
  formatRecordClock,
  remindersToScheduleRecords,
} from "@/lib/schedule-intelligence/schedule-record";
import { buildScheduleEventBlock } from "@/lib/schedule/infer-schedule-event-meta";
import { scoreScheduleTradeoff } from "@/lib/schedule/score-schedule-tradeoff";
import { inferExperienceMode } from "@/lib/experience/infer-experience-mode";
import { blocksOverlap } from "@/lib/schedule/schedule-time-utils";

function recordToEventBlock(record: {
  id: string;
  title: string;
  startMinutes: number;
}): ScheduleEventBlock {
  return buildScheduleEventBlock({
    id: record.id,
    title: record.title,
    startMinutes: record.startMinutes,
    contextText: record.title,
    source: "existing",
  });
}

function matchByLabel(
  records: ReturnType<typeof remindersToScheduleRecords>,
  label?: string
) {
  if (!label?.trim()) {
    return null;
  }
  return records.find((item) => item.title.includes(label.trim())) ?? null;
}

export function resolveNamedOverlapPair(input: {
  message: string;
  context: ScheduleIntelligenceContext;
  labelA?: string;
  labelB?: string;
  dateKey?: string;
}): [ScheduleEventBlock, ScheduleEventBlock] | null {
  const records = remindersToScheduleRecords(input.context.reminders);
  const dateKey = input.dateKey ?? input.context.referenceDate;
  const dayRecords = records.filter((item) => item.dateKey === dateKey);

  const aRecord =
    matchByLabel(dayRecords, input.labelA) ??
    dayRecords.find((item) => /미팅|회의/u.test(item.title));
  const bRecord =
    matchByLabel(dayRecords, input.labelB) ??
    dayRecords.find(
      (item) =>
        item.id !== aRecord?.id && /약속|미용|헤어|만남/u.test(item.title)
    );

  if (aRecord && bRecord) {
    return [recordToEventBlock(aRecord), recordToEventBlock(bRecord)];
  }

  for (let i = 0; i < dayRecords.length; i += 1) {
    for (let j = i + 1; j < dayRecords.length; j += 1) {
      const left = recordToEventBlock(dayRecords[i]!);
      const right = recordToEventBlock(dayRecords[j]!);
      if (
        blocksOverlap(
          left.startMinutes,
          left.durationMinutes,
          right.startMinutes,
          right.durationMinutes
        ) > 0
      ) {
        return [left, right];
      }
    }
  }

  if (dayRecords.length >= 2) {
    return [recordToEventBlock(dayRecords[0]!), recordToEventBlock(dayRecords[1]!)];
  }

  return null;
}

export function summarizeOverlapPriority(input: {
  message: string;
  context: ScheduleIntelligenceContext;
  labelA?: string;
  labelB?: string;
  dateKey?: string;
}): { summary: string; keepTitle: string; moveTitle: string } | null {
  const pair = resolveNamedOverlapPair(input);
  if (!pair) {
    return null;
  }

  const [eventA, eventB] = pair;
  const tradeoff = scoreScheduleTradeoff(eventA, eventB, inferExperienceMode(input.message));
  const keep = tradeoff.keepEventId === eventA.id ? eventA : eventB;
  const move = tradeoff.moveEventId === eventA.id ? eventA : eventB;

  return {
    summary: `겹치는 일정 중 **${keep.title}**(${keep.vitality})을(를) 우선하는 편이 낫습니다. ${move.title}은(는) ${move.durationMinutes}분 정도 미루는 조정을 검토해 보세요.`,
    keepTitle: keep.title,
    moveTitle: move.title,
  };
}

export function listDayScheduleSummary(context: ScheduleIntelligenceContext, dateKey?: string) {
  const key = dateKey ?? context.referenceDate;
  return remindersToScheduleRecords(context.reminders)
    .filter((item) => item.dateKey === key)
    .map((item) => `${formatRecordClock(item)} ${item.title}`)
    .join(", ");
}
