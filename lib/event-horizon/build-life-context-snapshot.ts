/**
 * Event Horizon — schedule/status-derived insights (not Global Brain).
 * GOAL Engine and turn gather read this; Global Brain only assembles the snapshot into prompts.
 */
import type {
  EventHorizonInsight,
  GlobalBrainSnapshot,
} from "@/lib/global-brain/types";
import type { DayScheduleTask } from "@/lib/schedule/day-schedule";
import type { ScheduleActivityWire } from "@/lib/schedule-intelligence/types";

function parseMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1]!, 10) * 60 + Number.parseInt(match[2]!, 10);
}

function isApexLikeTask(task: string): boolean {
  return /(?:미팅|meeting|회의|발표|면접|업무|프로젝트|데드라인|면담|보고|출근|근무|집중|코딩|작업)/iu.test(
    task,
  );
}

function isSentinelLikeTask(task: string): boolean {
  return /(?:마감|기한|병원|치과|항공|비행|출발|탑승|세금|신고|필수|긴급|약속)/iu.test(task);
}

function filterRemainingSchedule(
  schedule: DayScheduleTask[],
  nowMinutes: number,
): DayScheduleTask[] {
  return schedule.filter((item) => {
    const minutes = parseMinutes(item.time);
    return minutes == null || minutes >= nowMinutes - 15;
  });
}

function hasLunchWindow(schedule: DayScheduleTask[]): boolean {
  return schedule.some((item) => {
    const minutes = parseMinutes(item.time);
    if (minutes == null) {
      return false;
    }
    return minutes >= 11 * 60 && minutes <= 14 * 60;
  });
}

function findEarlyApexMeeting(schedule: DayScheduleTask[]): DayScheduleTask | null {
  for (const item of schedule) {
    const minutes = parseMinutes(item.time);
    if (minutes != null && minutes <= 10 * 60 && isApexLikeTask(item.task)) {
      return item;
    }
  }
  return null;
}

function detectLateNightWork(
  activities: ScheduleActivityWire[] | undefined,
  referenceDate: string,
): boolean {
  if (!activities?.length) {
    return false;
  }
  const yesterday = new Date(`${referenceDate}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  return activities.some((item) => {
    const stamp = item.timestamp || item.fireAt;
    if (!stamp) {
      return false;
    }
    if (!stamp.startsWith(yesterdayKey) && !stamp.startsWith(referenceDate)) {
      return false;
    }
    const hour = new Date(stamp).getHours();
    const text = `${item.title} ${item.text}`;
    return hour >= 22 || /(?:야근|늦게|밤\s*늦|overtime|late\s*night)/iu.test(text);
  });
}

export function buildLifeContextSnapshot(input: {
  referenceDate: string;
  existingSchedule: DayScheduleTask[];
  userGoals?: import("@/lib/goal-roadmap/types").UserGoalWire[];
  userStatus?: import("@/lib/global-brain/types").UserStatusRecord | null;
  recentStateMessages?: Array<{ flag: string; label: string; updatedAt: string }>;
  activitySources?: ScheduleActivityWire[];
  resolvedTemporal?: import("@/lib/time/temporal-types").TemporalResolution | null;
  userLocation?: import("@/lib/global-brain/types").UserLocationWire | null;
  preferences?: Array<{ key: string; value: string; label: string }>;
  nexusContacts?: Array<{ name: string; lastContactAt: string | null }>;
  scheduleListBatch?: import("@/lib/schedule/parse-schedule-list-batch").ParsedScheduleListBatch | null;
  actionEvents?: import("@/lib/action-event-registry/types").ActionEventWire[];
  now?: Date;
}): GlobalBrainSnapshot {
  const now = input.now ?? new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todaySchedule = input.existingSchedule ?? [];
  const remainingSchedule = filterRemainingSchedule(todaySchedule, nowMinutes);
  const sentinelTasks = remainingSchedule.filter((item) =>
    isSentinelLikeTask(item.task),
  );

  const snapshot: GlobalBrainSnapshot = {
    currentDateTime: now.toISOString(),
    referenceDate: input.referenceDate,
    todaySchedule,
    remainingSchedule,
    sentinelTasks,
    userGoals: input.userGoals ?? [],
    userStatus: input.userStatus ?? null,
    recentStateMessages: (input.recentStateMessages ?? []).map((item) => ({
      flag: item.flag as GlobalBrainSnapshot["recentStateMessages"][number]["flag"],
      label: item.label,
      updatedAt: item.updatedAt,
    })),
    eventHorizon: [],
    resolvedTemporal: input.resolvedTemporal ?? null,
    userLocation: input.userLocation ?? null,
    preferences: input.preferences ?? [],
    nexusContacts: input.nexusContacts ?? [],
    scheduleListBatch: input.scheduleListBatch
      ? {
          dateKey: input.scheduleListBatch.dateKey,
          dateLabel: input.scheduleListBatch.dateLabel,
          count: input.scheduleListBatch.items.length,
          items: input.scheduleListBatch.items.map((item) => ({
            time: item.time,
            task: item.task,
            datetime: item.datetime,
            vitality: item.vitality,
          })),
        }
      : null,
    actionEvents: input.actionEvents ?? [],
  };

  snapshot.eventHorizon = detectEventHorizon(snapshot, input.activitySources);
  return snapshot;
}

/** @deprecated use buildLifeContextSnapshot */
export const buildGlobalBrainSnapshot = buildLifeContextSnapshot;

export function detectEventHorizon(
  snapshot: GlobalBrainSnapshot,
  activitySources?: ScheduleActivityWire[],
): EventHorizonInsight[] {
  const insights: EventHorizonInsight[] = [];
  const status = snapshot.userStatus?.flag;
  const remaining = snapshot.remainingSchedule;
  const apexRemaining = remaining.filter((item) => isApexLikeTask(item.task));

  if (
    (status === "tired" || status === "anxious") &&
    apexRemaining.length >= 3
  ) {
    insights.push({
      kind: "tired_heavy_schedule",
      headline: "오늘 일정이 꽤 빡빡해요.",
      suggestion:
        "피곤하신 상태라면 덜 급한 Apex 블록부터 내일로 미루는 게 좋겠어요.",
      severity: "high",
    });
  }

  const earlyMeeting = findEarlyApexMeeting(remaining);
  if ((status === "tired" || status === "anxious") && earlyMeeting) {
    insights.push({
      kind: "tired_early_meeting",
      headline: `${earlyMeeting.time} ${earlyMeeting.task} — 몸 상태와 맞지 않을 수 있어요.`,
      suggestion: "미리 준비 시간을 줄이거나, 가능하면 시작 시간을 조정해 볼까요?",
      severity: "high",
    });
  }

  if (
    detectLateNightWork(activitySources, snapshot.referenceDate) &&
    findEarlyApexMeeting(remaining)
  ) {
    const meeting = findEarlyApexMeeting(remaining)!;
    insights.push({
      kind: "late_work_early_meeting",
      headline: `어젯밤 늦게까지 하셨는데, ${meeting.time} ${meeting.task}이 있어요.`,
      suggestion: "오늘은 핵심만 하고, 나머지는 과감히 미루는 게 낫겠어요.",
      severity: "high",
    });
  }

  const hour = new Date(snapshot.currentDateTime).getHours();
  if (
    hour >= 11 &&
    hour <= 14 &&
    !hasLunchWindow(remaining) &&
    (status === "hungry" || snapshot.userStatus == null)
  ) {
    insights.push({
      kind: "no_lunch_window",
      headline: "점심 시간인데 오늘 일정에 식사 블록이 없어요.",
      suggestion: "30분 점심 슬롯을 비워 둘까요?",
      severity: "medium",
    });
  }

  if (status === "stressed" && remaining.length >= 4) {
    insights.push({
      kind: "stressed_dense_day",
      headline: "스트레스 받는 날인데 일정이 많아요.",
      suggestion: "Sentinel 모드로 급한 것만 남기고 나머지는 잠시 멈출까요?",
      severity: "medium",
    });
  }

  return insights.sort((a, b) => {
    if (a.severity === b.severity) {
      return 0;
    }
    return a.severity === "high" ? -1 : 1;
  });
}
