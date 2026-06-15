/** Goal Roadmap owns user goals, progress, and alignment scoring — GOAL Engine reads only (§5). */
import type { GoalAlignmentWire, ScheduleIntelligenceContext } from "@/lib/schedule-intelligence/types";
import type { ScheduleQueryAnalysis } from "@/lib/schedule-intelligence/types";
import {
  addDaysToDateKey,
  formatRecordClock,
  remindersToScheduleRecords,
  weekRangeFromReference,
} from "@/lib/schedule-intelligence/schedule-record";
import type { UserGoal } from "@/lib/goal-roadmap/types";
import { inferVitalityFromText } from "@/lib/schedule/infer-schedule-event-meta";

const REVENUE_KEYWORDS = /수익|매출|영업|프로젝트|납품|클라이언트|견적|계약|발표|업무/u;
const LOW_VALUE_KEYWORDS = /카페|놀|게임|유튜브|쇼핑|산책|영화/u;

function resolveGoals(context: ScheduleIntelligenceContext): UserGoal[] {
  return (context.goals ?? []) as UserGoal[];
}

function weekRecords(context: ScheduleIntelligenceContext) {
  const { start, end } = weekRangeFromReference(context.referenceDate);
  return remindersToScheduleRecords(context.reminders).filter(
    (item) => item.dateKey >= start && item.dateKey <= end
  );
}

function classifyRecord(title: string) {
  const vitality = inferVitalityFromText(title);
  const revenue = REVENUE_KEYWORDS.test(title);
  const low = LOW_VALUE_KEYWORDS.test(title);
  return { vitality, revenue, low };
}

/** Tier 3 — revenue goal vs weekly schedule tradeoffs. */
export function alignRevenueGoal(input: {
  analysis: ScheduleQueryAnalysis;
  context: ScheduleIntelligenceContext;
}): GoalAlignmentWire {
  const goals = resolveGoals(input.context);
  const revenueGoal =
    goals.find((item) => item.kind === "revenue") ??
    (input.analysis.revenueTarget
      ? {
          id: "inline",
          kind: "revenue" as const,
          label: "월 수익 목표",
          targetValue: input.analysis.revenueTarget,
          unit: "원",
          createdAt: "",
          updatedAt: "",
        }
      : null);

  const records = weekRecords(input.context);
  const cutCandidates: string[] = [];
  const boostCandidates: string[] = [];

  for (const record of records) {
    const tag = classifyRecord(record.title);
    if (tag.low || tag.vitality === "Haven") {
      cutCandidates.push(`${formatRecordClock(record)} ${record.title}`);
    }
    if (tag.revenue || tag.vitality === "Apex") {
      boostCandidates.push(`${formatRecordClock(record)} ${record.title}`);
    }
  }

  const targetLabel = revenueGoal?.targetValue
    ? `${Math.round(revenueGoal.targetValue / 10_000)}만 원`
    : "수익";

  const suggestions = [
    cutCandidates.length
      ? `여유·취미 블록 ${Math.min(2, cutCandidates.length)}개를 줄이면 집중 시간이 생겨요.`
      : "이번 주는 여유 일정이 많지 않아요 — 대신 Apex 업무 블록을 늘려 보세요.",
    boostCandidates.length
      ? `수익 연계 일정(${boostCandidates.slice(0, 2).join(", ")})을 우선 확보하세요.`
      : "수익 창출 활동(영업·납품·프로젝트) 블록을 2~3개 새로 잡는 걸 추천해요.",
    "주 2회 90분 '수익 집중' 타임박스를 캘린더에 고정해 두면 목표 추적이 쉬워요.",
  ];

  return {
    kind: "revenue_alignment",
    summary: `${targetLabel} 목표 기준, 이번 주 일정에서 **취미·여유 블록을 줄이고 Apex 업무·수익 활동을 늘리는** 조정이 필요해 보여요.`,
    suggestions,
    cutCandidates: cutCandidates.slice(0, 4),
    boostCandidates: boostCandidates.slice(0, 4),
  };
}

/** Tier 3 — insert study blocks for certification goals. */
export function planStudyBlocks(input: {
  analysis: ScheduleQueryAnalysis;
  context: ScheduleIntelligenceContext;
}): GoalAlignmentWire {
  const goals = resolveGoals(input.context);
  const certGoal =
    goals.find((item) => item.kind === "certification") ??
    ({
      id: "inline-cert",
      kind: "certification" as const,
      label: input.analysis.certificationLabel ?? "자격증",
      studyHoursPerWeek: 6,
      createdAt: "",
      updatedAt: "",
    } as UserGoal);

  const month = input.analysis.studyMonth ?? new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const hoursPerWeek = certGoal.studyHoursPerWeek ?? 6;
  const sessions = Math.max(2, Math.ceil(hoursPerWeek / 2));

  const studyBlocks: GoalAlignmentWire["studyBlocks"] = [];
  for (let i = 0; i < sessions; i += 1) {
    const dateKey = addDaysToDateKey(`${monthPrefix}-01`, i * 2 + 1);
    studyBlocks.push({
      dateKey,
      time: i % 2 === 0 ? "07:00" : "20:00",
      label: `${certGoal.label} 공부 ${i + 1}/${sessions}`,
    });
  }

  return {
    kind: "study_block",
    summary: `${month}월 스케줄에 **${certGoal.label}** 공부 블록 ${sessions}개(주 ${hoursPerWeek}시간)를 끼워 넣을 수 있어요.`,
    suggestions: [
      "아침 7시·저녁 8시처럼 고정 슬롯이 복습 루틴에 잘 맞아요.",
      "주말 1회는 모의고사·오답 정리용 2시간 블록으로 비워 두세요.",
      "시험 4주 전부터는 Haven 일정을 줄이고 Apex 공부 비중을 올리세요.",
    ],
    studyBlocks,
  };
}

/** Tier 3 — daily productivity score vs roadmap goals. */
export function scoreDailyProductivity(input: {
  context: ScheduleIntelligenceContext;
}): GoalAlignmentWire {
  const goals = resolveGoals(input.context);
  const todayRecords = remindersToScheduleRecords(input.context.reminders).filter(
    (item) => item.dateKey === input.context.referenceDate
  );

  let apexMinutes = 0;
  let havenMinutes = 0;
  let nexusMinutes = 0;
  let revenueHits = 0;

  for (const record of todayRecords) {
    const tag = classifyRecord(record.title);
    const duration = record.endMinutes - record.startMinutes;
    if (tag.vitality === "Apex") {
      apexMinutes += duration;
    } else if (tag.vitality === "Haven") {
      havenMinutes += duration;
    } else {
      nexusMinutes += duration;
    }
    if (tag.revenue) {
      revenueHits += 1;
    }
  }

  const goalBoost = goals.some((item) => item.kind === "revenue" || item.kind === "certification")
    ? 8
    : 0;
  const raw =
    Math.min(40, apexMinutes / 3) +
    Math.min(20, nexusMinutes / 4) +
    revenueHits * 12 +
    goalBoost -
    Math.min(25, havenMinutes / 4);

  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const gaps: string[] = [];
  if (apexMinutes < 60) {
    gaps.push("Apex(업무·집중) 블록이 1시간 미만이에요.");
  }
  if (goals.some((item) => item.kind === "revenue") && revenueHits === 0) {
    gaps.push("수익 목표 대비 오늘 수익 창출 활동이 없었어요.");
  }
  if (goals.some((item) => item.kind === "certification") && apexMinutes < 90) {
    gaps.push("자격증 목표 대비 공부·집중 시간이 부족해요.");
  }
  if (havenMinutes > apexMinutes + nexusMinutes) {
    gaps.push("여유·취미 비중이 목표 로드맵보다 높아요.");
  }
  if (gaps.length === 0) {
    gaps.push("오늘은 목표 대비 균형이 괜찮아요 — 내일도 Apex 블록 1개만 유지해 보세요.");
  }

  return {
    kind: "productivity_score",
    score,
    summary: `오늘 생산성 점수는 **${score}점**이에요. (Apex ${Math.round(apexMinutes / 60)}h · Nexus ${Math.round(nexusMinutes / 60)}h · Haven ${Math.round(havenMinutes / 60)}h)`,
    suggestions: gaps,
  };
}

export function orchestrateGoalAlignment(input: {
  analysis: ScheduleQueryAnalysis;
  context: ScheduleIntelligenceContext;
}): GoalAlignmentWire {
  if (input.analysis.kind === "productivity_score") {
    return scoreDailyProductivity({ context: input.context });
  }
  if (input.analysis.kind === "study_block") {
    return planStudyBlocks(input);
  }
  return alignRevenueGoal(input);
}
