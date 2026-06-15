import { extractRetrievalKeywords } from "@/lib/schedule-intelligence/extract-retrieval-keywords";
import {
  formatRecordClock,
  remindersToScheduleRecords,
  weekRangeFromReference,
} from "@/lib/schedule-intelligence/schedule-record";
import type {
  DeepRetrievalStage,
  ScheduleActivityWire,
  ScheduleIntelligenceContext,
  ScheduleQueryAnalysis,
  ScheduleRecord,
  ScheduleRetrievalItem,
  ScheduleRetrievalWire,
} from "@/lib/schedule-intelligence/types";

export const DEEP_RETRIEVAL_USER_IN_LOOP =
  "검색 범위 내에 등록된 일정을 찾지 못했습니다. 혹시 직접 입력해 주신 데이터인가요? 일정의 대략적인 시간과 이름을 알려주시면 바로 반영하겠습니다.";

const MS_24H = 24 * 60 * 60 * 1000;

function formatKoreanDateLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m}월 ${d}일`;
}

function recordInTimeRange(
  record: { startMinutes: number; endMinutes: number },
  start?: number,
  end?: number
): boolean {
  if (start == null && end == null) {
    return true;
  }
  const rangeStart = start ?? 0;
  const rangeEnd = end ?? 24 * 60;
  return record.startMinutes < rangeEnd && record.endMinutes > rangeStart;
}

function recordToItem(
  record: ScheduleRecord,
  source: ScheduleRetrievalItem["source"],
  note?: string
): ScheduleRetrievalItem {
  return {
    dateKey: record.dateKey,
    time: formatRecordClock(record),
    title: record.title,
    source,
    note,
  };
}

function fireAtMs(iso: string): number {
  return new Date(iso).getTime();
}

function dateWindowMs(dateKey: string, padHours: number): { start: number; end: number } {
  const anchor = new Date(`${dateKey}T12:00:00`);
  return {
    start: anchor.getTime() - padHours * 60 * 60 * 1000,
    end: anchor.getTime() + padHours * 60 * 60 * 1000,
  };
}

function inDateWindow(record: ScheduleRecord, dateKey: string, padHours: number): boolean {
  const { start, end } = dateWindowMs(dateKey, padHours);
  const ms = fireAtMs(record.fireAt);
  return ms >= start && ms <= end;
}

function strictKeywordMatch(title: string, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return true;
  }
  const normalized = title.toLowerCase();
  return keywords.every((keyword) => normalized.includes(keyword.toLowerCase()));
}

function looseKeywordMatch(title: string, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return true;
  }
  const normalized = title.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function filterByAnalysisWindow(
  records: ScheduleRecord[],
  analysis: ScheduleQueryAnalysis,
  context: ScheduleIntelligenceContext,
  padHours = 0
): ScheduleRecord[] {
  if (analysis.kind === "week_tasks") {
    const { start, end } = weekRangeFromReference(context.referenceDate);
    return records.filter((item) => item.dateKey >= start && item.dateKey <= end);
  }

  const dateKey = analysis.dateKey ?? context.referenceDate;

  if (padHours > 0) {
    return records.filter((item) => inDateWindow(item, dateKey, padHours));
  }

  return records
    .filter((item) => item.dateKey === dateKey)
    .filter((item) =>
      recordInTimeRange(item, analysis.rangeStartMinutes, analysis.rangeEndMinutes)
    );
}

function searchStrictRecords(
  records: ScheduleRecord[],
  analysis: ScheduleQueryAnalysis,
  context: ScheduleIntelligenceContext,
  keywords: string[]
): ScheduleRetrievalItem[] {
  const scoped = filterByAnalysisWindow(records, analysis, context, 0);

  if (analysis.kind === "person_search" && analysis.personName) {
    const needle = analysis.personName.trim();
    return scoped
      .filter((item) => item.title.includes(needle))
      .map((item) => recordToItem(item, "reminder"));
  }

  return scoped
    .filter((item) => strictKeywordMatch(item.title, keywords))
    .map((item) => recordToItem(item, "reminder"));
}

function searchLooseRecords(
  records: ScheduleRecord[],
  analysis: ScheduleQueryAnalysis,
  context: ScheduleIntelligenceContext,
  keywords: string[]
): ScheduleRetrievalItem[] {
  const scoped = filterByAnalysisWindow(records, analysis, context, 24);
  return scoped
    .filter((item) => looseKeywordMatch(item.title, keywords))
    .map((item) => recordToItem(item, "reminder", "범위 확장(±24h)"));
}

function activityToItem(entry: ScheduleActivityWire): ScheduleRetrievalItem | null {
  const iso = entry.fireAt ?? entry.timestamp;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) {
    return null;
  }

  const dateKey = iso.slice(0, 10);
  const time = at.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const source: ScheduleRetrievalItem["source"] =
    entry.source === "notification_shadow" ? "notification" : "activity_feed";

  return {
    dateKey,
    time,
    title: entry.title.trim() || entry.text.trim().slice(0, 40),
    source,
    note: "활동 로그",
  };
}

function searchActivitySources(
  sources: ScheduleActivityWire[],
  keywords: string[],
  analysis: ScheduleQueryAnalysis,
  context: ScheduleIntelligenceContext
): ScheduleRetrievalItem[] {
  const dateKey = analysis.dateKey ?? context.referenceDate;
  const { start, end } = dateWindowMs(dateKey, 24);

  const hits: ScheduleRetrievalItem[] = [];

  for (const entry of sources) {
    const haystack = `${entry.title} ${entry.text}`.toLowerCase();
    const keywordOk =
      keywords.length === 0 || keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
    if (!keywordOk) {
      continue;
    }

    const iso = entry.fireAt ?? entry.timestamp;
    const ms = new Date(iso).getTime();
    if (analysis.kind !== "week_tasks" && (ms < start || ms > end)) {
      continue;
    }

    const item = activityToItem(entry);
    if (item) {
      hits.push(item);
    }
  }

  return hits.sort(
    (left, right) =>
      new Date(`${right.dateKey}T${right.time}`).getTime() -
      new Date(`${left.dateKey}T${left.time}`).getTime()
  );
}

/** Prefer activity/notification rows over stale calendar when titles overlap. */
function mergePreferActivityLog(
  calendar: ScheduleRetrievalItem[],
  activity: ScheduleRetrievalItem[]
): ScheduleRetrievalItem[] {
  if (activity.length === 0) {
    return calendar;
  }

  const activityTitles = new Set(activity.map((item) => item.title.toLowerCase()));
  const calendarFiltered = calendar.filter(
    (item) => !activityTitles.has(item.title.toLowerCase())
  );

  return [...activity, ...calendarFiltered];
}

function buildQueryLabel(
  analysis: ScheduleQueryAnalysis,
  context: ScheduleIntelligenceContext,
  stage: DeepRetrievalStage
): string {
  const stageTag =
    stage === 1
      ? "정확 검색"
      : stage === 2
        ? "범위 확장 검색"
        : stage === 3
          ? "활동·알림 로그"
          : "검색 실패";

  if (analysis.kind === "week_tasks") {
    return `이번 주 태스크 · ${stageTag}`;
  }

  if (analysis.kind === "person_search" && analysis.personName) {
    return `${analysis.personName}님 관련 일정 · ${stageTag}`;
  }

  const dateKey = analysis.dateKey ?? context.referenceDate;
  const rangeLabel =
    analysis.rangeStartMinutes != null && analysis.rangeEndMinutes != null
      ? `${Math.floor(analysis.rangeStartMinutes / 60)}~${Math.floor(analysis.rangeEndMinutes / 60)}시`
      : "하루";

  return `${formatKoreanDateLabel(dateKey)} ${rangeLabel} · ${stageTag}`;
}

/** 4-stage Deep Retrieval Protocol for schedule queries. */
export function runDeepScheduleRetrieval(input: {
  message: string;
  analysis: ScheduleQueryAnalysis;
  context: ScheduleIntelligenceContext;
}): ScheduleRetrievalWire {
  const { analysis, context, message } = input;
  const keywords = extractRetrievalKeywords(message, analysis);
  const records = remindersToScheduleRecords(context.reminders);
  const activitySources = context.activitySources ?? [];

  let stage: DeepRetrievalStage = 1;
  let items = searchStrictRecords(records, analysis, context, keywords);

  if (items.length === 0) {
    stage = 2;
    items = searchLooseRecords(records, analysis, context, keywords);
  }

  if (items.length === 0) {
    stage = 3;
    const fromActivity = searchActivitySources(activitySources, keywords, analysis, context);
    items = mergePreferActivityLog([], fromActivity);
  } else if (activitySources.length > 0 && keywords.length > 0) {
    const fromActivity = searchActivitySources(activitySources, keywords, analysis, context);
    if (fromActivity.length > 0) {
      stage = 3;
      items = mergePreferActivityLog(items, fromActivity);
    }
  }

  if (items.length === 0) {
    stage = 4;
    return {
      kind: analysis.kind,
      queryLabel: buildQueryLabel(analysis, context, stage),
      items: [],
      retrievalStage: stage,
      userInLoop: true,
      emptyMessage: DEEP_RETRIEVAL_USER_IN_LOOP,
    };
  }

  return {
    kind: analysis.kind,
    queryLabel: buildQueryLabel(analysis, context, stage),
    items: items.slice(0, 12),
    retrievalStage: stage,
  };
}
