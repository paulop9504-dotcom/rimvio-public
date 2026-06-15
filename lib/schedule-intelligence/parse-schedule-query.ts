import type { ScheduleQueryAnalysis } from "@/lib/schedule-intelligence/types";
import { addDaysToDateKey } from "@/lib/schedule-intelligence/schedule-record";
import { parseKoreanTimeFromText } from "@/lib/schedule/schedule-time-utils";
import { normalizeKoreanHour, normalizeTimeFromText } from "@/lib/time/normalize-time";

const RETRIEVAL_RANGE =
  /(?:일정|스케줄|캘린더|잡힌|예약|약속).*(?:뭐|무엇|알려|불러|보여|확인|있)/u;
const RETRIEVAL_WEEK =
  /(?:이번\s*주|금주).*(?:태스크|할\s*일|완료|마감|리스트|목록)/u;
const PERSON_SEARCH =
  /(?:가장\s*)?(?:최근|마지막).*(?:관련\s*일정|관련\s*약속|입력한)/u;
const PERSON_NAMED =
  /['"「]([^'"」]{2,12})['"」]|([가-힣A-Za-z]{2,8})(?:님|씨)\s*(?:관련|일정|약속|미팅)/u;

const OVERLAP_PRIORITY =
  /(?:겹|충돌|양립|불가).*(?:중요|우선|먼저|효율|뭐가|어떤)/u;
const DEPARTURE =
  /(?:가려|가\s*려|출발|늦지\s*않|도착|교통|길찾).*(?:미팅|회의|약속|일정|\d{1,2}\s*시|\d{1,2}:\d{2})/u;
const RESCHEDULE =
  /(?:미뤄|미루|연기|늦어|변경|바뀌).*(?:반영|정리|다시|전체|스케줄)/u;

const REVENUE_GOAL =
  /(?:수익|매출|목표).*(?:달성|달성하|줄이|늘려|창출|500|만\s*원)/u;
const CERT_GOAL =
  /(?:자격증|시험|공부\s*시간|취득).*(?:목표|확보|끼워|스케줄|준비)/u;
const PRODUCTIVITY =
  /(?:생산성|점수|로드맵|목표).*(?:비교|몇\s*점|부족|오늘\s*하루)/u;

function parseTimeRange(message: string): {
  startMinutes?: number;
  endMinutes?: number;
} {
  const rangeMatch = message.match(
    /(?:오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?\s*(?:부터|~|-)\s*(?:오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/u
  );
  if (rangeMatch) {
    const startPart = message.slice(0, (rangeMatch.index ?? 0) + rangeMatch[0].length / 2);
    const endPart = message.slice(rangeMatch.index ?? 0);
    const startHourRaw = Number.parseInt(rangeMatch[1]!, 10);
    const endHourRaw = Number.parseInt(rangeMatch[3]!, 10);
    const startMin = Number.parseInt(rangeMatch[2] ?? "0", 10);
    const endMin = Number.parseInt(rangeMatch[4] ?? "0", 10);
    const startHour = normalizeKoreanHour({
      hour: startHourRaw,
      context: message,
      localContext: startPart,
    }).hour;
    const endHour = normalizeKoreanHour({
      hour: endHourRaw,
      context: message,
      localContext: endPart,
    }).hour;
    return {
      startMinutes: startHour * 60 + startMin,
      endMinutes: endHour * 60 + endMin,
    };
  }

  const colonRange = message.match(/(\d{1,2}:\d{2})\s*(?:~|-|부터)\s*(\d{1,2}:\d{2})/u);
  if (colonRange) {
    const start = normalizeTimeFromText(colonRange[1]!);
    const end = normalizeTimeFromText(colonRange[2]!);
    if (start && end) {
      return {
        startMinutes: start.hour * 60 + start.minute,
        endMinutes: end.hour * 60 + end.minute,
      };
    }
  }

  return {};
}

function resolveDateKey(message: string, referenceDate: string): string {
  if (/내일/u.test(message)) {
    return addDaysToDateKey(referenceDate, 1);
  }
  if (/모레/u.test(message)) {
    return addDaysToDateKey(referenceDate, 2);
  }
  if (/오늘/u.test(message)) {
    return referenceDate;
  }
  const md = message.match(/(\d{1,2})월\s*(\d{1,2})일/u);
  if (md) {
    const ref = new Date(`${referenceDate}T12:00:00+09:00`);
    ref.setMonth(Number.parseInt(md[1]!, 10) - 1, Number.parseInt(md[2]!, 10));
    return ref.toISOString().slice(0, 10);
  }
  return referenceDate;
}

function extractPersonName(message: string): string | undefined {
  const quoted = message.match(/['"「]([^'"」]{2,12})['"」]/u)?.[1];
  if (quoted) {
    return quoted.replace(/님$/u, "").trim();
  }

  const named = message.match(
    /([가-힣A-Za-z]{2,8})(?:님|씨)\s*(?:관련|일정|약속|미팅)/u
  )?.[1];
  if (named) {
    return named.trim();
  }

  const recent = message.match(
    /(?:최근|마지막).*(?:입력|등록|추가).*(?:예)?\)?['"]?([가-힣A-Za-z]{2,8})/u
  )?.[1];
  return recent?.trim();
}

function extractMeetingMinutes(message: string): number | undefined {
  const timeMatch = /(\d{1,2}\s*시(?:\s*반|30분?)?|\d{1,2}:\d{2})/u.exec(message);
  if (!timeMatch?.index) {
    return undefined;
  }
  const parsed = parseKoreanTimeFromText(message, timeMatch.index, message);
  return parsed?.minutes;
}

function extractDestination(message: string): string | undefined {
  const place =
    message.match(/([가-힣A-Za-z0-9]{2,12}(?:동|구|역|시))\s*(?:에\s*)?(?:가|갈|가려)/u)?.[1] ??
    message.match(/(?:둔산|유성|강남|수서|판교|역삼)[가-힣]*/u)?.[0];
  return place?.trim();
}

function extractDelayMinutes(message: string): number {
  const minMatch = message.match(/(\d{1,3})\s*분\s*(?:미뤄|미루|연기|늦)/u);
  if (minMatch) {
    return Number.parseInt(minMatch[1]!, 10);
  }
  if (/반\s*시간|30분/u.test(message)) {
    return 30;
  }
  if (/1\s*시간/u.test(message)) {
    return 60;
  }
  return 30;
}

function extractEventLabels(message: string): { a?: string; b?: string } {
  const ab = message.match(/([A-Za-z가-힣0-9]{1,8})\s*(?:미팅|약속|일정).*(?:와|과|랑)\s*([A-Za-z가-힣0-9]{1,8})/u);
  if (ab) {
    return { a: ab[1], b: ab[2] };
  }
  const first = message.match(/([A-Za-z가-힣0-9]{1,8})\s*(?:미팅|약속)/u)?.[1];
  const second = message.match(/(?:와|과|랑)\s*([A-Za-z가-힣0-9]{1,8})\s*(?:미팅|약속)/u)?.[1];
  return { a: first, b: second };
}

function parseRevenueTarget(message: string): number | undefined {
  const won = message.match(/(\d+)\s*만\s*원/u);
  if (won) {
    return Number.parseInt(won[1]!, 10) * 10_000;
  }
  const raw = message.match(/(\d{3,9})\s*원/u);
  if (raw) {
    return Number.parseInt(raw[1]!, 10);
  }
  return undefined;
}

function parseStudyMonth(message: string): number | undefined {
  const m = message.match(/(\d{1,2})월\s*스케줄/u)?.[1];
  return m ? Number.parseInt(m, 10) : undefined;
}

/** Rules-first schedule / goal query classifier (3 tiers). */
export function analyzeScheduleQuery(input: {
  message: string;
  referenceDate?: string;
}): ScheduleQueryAnalysis | null {
  const message = input.message.trim();
  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);

  if (!message) {
    return null;
  }

  if (PRODUCTIVITY.test(message)) {
    return { tier: "goal", kind: "productivity_score", label: "productivity_score" };
  }

  if (REVENUE_GOAL.test(message)) {
    return {
      tier: "goal",
      kind: "revenue_alignment",
      label: "revenue_alignment",
      revenueTarget: parseRevenueTarget(message),
    };
  }

  if (CERT_GOAL.test(message)) {
    return {
      tier: "goal",
      kind: "study_block",
      label: "study_block",
      certificationLabel: message.match(/([가-힣A-Za-z0-9\s]{2,20}자격증)/u)?.[1] ?? "자격증",
      studyMonth: parseStudyMonth(message),
    };
  }

  if (RESCHEDULE.test(message)) {
    const labels = extractEventLabels(message);
    return {
      tier: "conflict",
      kind: "reschedule_propagation",
      label: "reschedule_propagation",
      delayMinutes: extractDelayMinutes(message),
      eventLabelA: labels.a,
    };
  }

  if (DEPARTURE.test(message)) {
    return {
      tier: "conflict",
      kind: "departure_time",
      label: "departure_time",
      destination: extractDestination(message),
      meetingMinutes: extractMeetingMinutes(message),
      dateKey: resolveDateKey(message, referenceDate),
    };
  }

  if (OVERLAP_PRIORITY.test(message) || /(?:미팅|약속).*(?:겹|충돌)/u.test(message)) {
    const labels = extractEventLabels(message);
    return {
      tier: "conflict",
      kind: "overlap_priority",
      label: "overlap_priority",
      eventLabelA: labels.a,
      eventLabelB: labels.b,
      dateKey: resolveDateKey(message, referenceDate),
    };
  }

  if (RETRIEVAL_WEEK.test(message)) {
    return { tier: "retrieval", kind: "week_tasks", label: "week_tasks" };
  }

  if (
    RETRIEVAL_RANGE.test(message) ||
    /(?:내일|오늘|모레).*(?:\d{1,2}\s*시|오전|오후).*(?:일정|약속|미팅)/u.test(message)
  ) {
    const range = parseTimeRange(message);
    return {
      tier: "retrieval",
      kind: "time_range",
      label: "time_range",
      dateKey: resolveDateKey(message, referenceDate),
      rangeStartMinutes: range.startMinutes,
      rangeEndMinutes: range.endMinutes,
    };
  }

  if (PERSON_SEARCH.test(message) || PERSON_NAMED.test(message)) {
    return {
      tier: "retrieval",
      kind: "person_search",
      label: "person_search",
      personName: extractPersonName(message),
    };
  }

  if (
    /(?:일정|태스크|할\s*일|리스트|목록).*(?:불러|알려|보여|확인|뭐)/u.test(message)
  ) {
    return {
      tier: "retrieval",
      kind: "time_range",
      label: "time_range",
      dateKey: resolveDateKey(message, referenceDate),
    };
  }

  return null;
}

export function isScheduleIntelligenceQuery(message: string): boolean {
  return analyzeScheduleQuery({ message }) != null;
}
