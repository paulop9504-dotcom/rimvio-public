import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import { buildScheduleEventBlock } from "@/lib/schedule/infer-schedule-event-meta";
import type { ScheduleEventBlock } from "@/lib/schedule/schedule-block-types";
import {
  blocksOverlap,
  parseClockToMinutes,
  parseKoreanTimeFromText,
} from "@/lib/schedule/schedule-time-utils";

const ADVISORY_QUERY =
  /(?:미뤄|미루|조정|옮길|옮기|뭐가\s*(?:더\s*)?(?:효율|효율적|나|좋)|어떻게\s*할|겹|충돌|양립|불가|선택|아니면|vs|대신)/iu;

const TWO_EVENT_HINT =
  /(?:미용|헤어|미팅|회의|약속).*(?:미용|헤어|미팅|회의|약속)/iu;

function extractTitleFromClause(
  clause: string,
  timeIndex: number,
  timeRaw: string
): string {
  const before = clause
    .slice(0, timeIndex)
    .replace(/(?:이|가|은|는|을|를|에|의|도)$/u, "")
    .trim();

  if (before.length >= 2) {
    return before.slice(-28);
  }

  const after = clause
    .slice(timeIndex + timeRaw.length)
    .replace(/^(?:에|부터|까지)\s*/u, "")
    .replace(/(?:일정|예약|잡혀).*/u, "")
    .trim();

  return after.slice(0, 32) || "일정";
}

function parseEventsFromMessage(message: string): ScheduleEventBlock[] {
  const events: ScheduleEventBlock[] = [];
  const clauses = message
    .split(/[,，]|(?:인데|지만|그리고)/u)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const clause of clauses) {
    const timePattern = /(\d{1,2}\s*시(?:\s*(?:반|30분?))?|\d{1,2}:\d{2})/u;
    const match = timePattern.exec(clause);
    if (!match) {
      continue;
    }

    const index = match.index ?? 0;
    const parsed = parseKoreanTimeFromText(clause, index, clause);
    if (!parsed) {
      continue;
    }

    const title = extractTitleFromClause(clause, index, parsed.raw);

    events.push(
      buildScheduleEventBlock({
        id: `msg-${events.length}`,
        title,
        startMinutes: parsed.minutes,
        contextText: clause,
        source: "message",
      })
    );
  }

  return events;
}

function eventsFromExistingSchedule(
  existing: ExistingScheduleInput
): ScheduleEventBlock[] {
  return existing.map((task, index) => {
    const minutes = parseClockToMinutes(task.time.length === 4 ? `0${task.time}` : task.time);
    return buildScheduleEventBlock({
      id: `existing-${index}`,
      title: task.task,
      startMinutes: minutes ?? 9 * 60,
      contextText: task.task,
      source: "existing",
    });
  });
}

export function isScheduleAdvisoryQuery(message: string): boolean {
  const trimmed = message.trim();
  if (!ADVISORY_QUERY.test(trimmed)) {
    return false;
  }
  const timeHits = trimmed.match(/(\d{1,2}\s*시|\d{1,2}:\d{2})/gu)?.length ?? 0;
  return timeHits >= 2 || TWO_EVENT_HINT.test(trimmed);
}

export function resolveAdvisoryEventPair(input: {
  message: string;
  existingSchedule?: ExistingScheduleInput;
}): ScheduleEventBlock[] | null {
  const fromMessage = parseEventsFromMessage(input.message);
  const fromExisting = eventsFromExistingSchedule(input.existingSchedule ?? []);

  if (fromMessage.length >= 2) {
    return fromMessage.slice(0, 2) as [ScheduleEventBlock, ScheduleEventBlock];
  }

  if (fromMessage.length === 1 && fromExisting.length > 0) {
    const anchor = fromMessage[0]!;
    const partner = fromExisting.find((candidate) => {
      const overlap = blocksOverlap(
        anchor.startMinutes,
        anchor.durationMinutes,
        candidate.startMinutes,
        candidate.durationMinutes
      );
      return overlap > 0 || Math.abs(anchor.startMinutes - candidate.startMinutes) <= 90;
    });
    if (partner) {
      return [anchor, partner];
    }
    if (fromExisting[0]) {
      return [anchor, fromExisting[0]];
    }
  }

  if (fromExisting.length >= 2) {
    for (let i = 0; i < fromExisting.length; i += 1) {
      for (let j = i + 1; j < fromExisting.length; j += 1) {
        const a = fromExisting[i]!;
        const b = fromExisting[j]!;
        if (
          blocksOverlap(
            a.startMinutes,
            a.durationMinutes,
            b.startMinutes,
            b.durationMinutes
          ) > 0
        ) {
          return [a, b];
        }
      }
    }
  }

  return null;
}

export function findBlockOverlap(
  a: ScheduleEventBlock,
  b: ScheduleEventBlock
): number {
  return blocksOverlap(
    a.startMinutes,
    a.durationMinutes,
    b.startMinutes,
    b.durationMinutes
  );
}
