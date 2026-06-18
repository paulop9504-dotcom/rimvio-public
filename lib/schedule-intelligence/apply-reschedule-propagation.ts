import type {
  ReschedulePropagationWire,
  ScheduleIntelligenceContext,
  ScheduleQueryAnalysis,
} from "@/lib/schedule-intelligence/types";
import {
  formatRecordClock,
  remindersToScheduleRecords,
} from "@/lib/schedule-intelligence/schedule-record";
import { blocksOverlap } from "@/lib/schedule/schedule-time-utils";
import { buildScheduleEventBlock } from "@/lib/schedule/infer-schedule-event-meta";

function findShiftTarget(
  analysis: ScheduleQueryAnalysis,
  context: ScheduleIntelligenceContext
) {
  const records = remindersToScheduleRecords(context.reminders);
  const label = analysis.eventLabelA?.trim();

  if (label) {
    const match = records.find((item) => item.title.includes(label));
    if (match) {
      return match;
    }
  }

  return records.find((item) => /미팅|회의|약속|헤어|미용/u.test(item.title)) ?? records[0];
}

/** Tier 2 — propagate one event delay across the day timeline. */
export function applyReschedulePropagation(input: {
  analysis: ScheduleQueryAnalysis;
  context: ScheduleIntelligenceContext;
}): ReschedulePropagationWire | null {
  const delayMinutes = input.analysis.delayMinutes ?? 30;
  const records = remindersToScheduleRecords(input.context.reminders);
  const target = findShiftTarget(input.analysis, input.context);

  if (!target) {
    return null;
  }

  const shiftedStart = target.startMinutes + delayMinutes;
  const shiftedEnd = target.endMinutes + delayMinutes;
  const shiftedBlock = buildScheduleEventBlock({
    id: target.id,
    title: target.title,
    startMinutes: shiftedStart,
    contextText: target.title,
    source: "existing",
  });

  const sameDay = records.filter((item) => item.dateKey === target.dateKey);
  const revised = sameDay
    .map((item) => {
      if (item.id === target.id) {
        return {
          dateKey: item.dateKey,
          time: formatRecordClock({ ...item, startMinutes: shiftedStart }),
          title: item.title,
          note: `${delayMinutes}분 연기 반영`,
        };
      }

      const overlap = blocksOverlap(
        shiftedStart,
        shiftedBlock.durationMinutes,
        item.startMinutes,
        item.endMinutes - item.startMinutes
      );

      if (overlap > 0 && item.startMinutes >= target.startMinutes) {
        const nudged = item.startMinutes + delayMinutes;
        return {
          dateKey: item.dateKey,
          time: formatRecordClock({ ...item, startMinutes: nudged }),
          title: item.title,
          note: "연쇄 조정",
        };
      }

      return {
        dateKey: item.dateKey,
        time: formatRecordClock(item),
        title: item.title,
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  return {
    shiftedEventId: target.id,
    shiftedTitle: target.title,
    delayMinutes,
    revised,
  };
}

export function formatRescheduleSummary(wire: ReschedulePropagationWire): string {
  const lines = wire.revised.map((item) => {
    const note = item.note ? ` (${item.note})` : "";
    return `· ${item.time} — ${item.title}${note}`;
  });

  return `${wire.shiftedTitle} ${wire.delayMinutes}분 연기를 반영한 하루 일정이에요.\n${lines.join("\n")}`;
}
