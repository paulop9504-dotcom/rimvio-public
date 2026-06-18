import type { ScheduleQueryAnalysis } from "@/lib/schedule-intelligence/types";
import type { DepartureAdviceWire } from "@/lib/schedule-intelligence/types";
import { computeLeaveTime, formatLeaveTimeClock } from "@/lib/context-resolver/leave-time-engine";
import { trafficProvider } from "@/lib/context-resolver/providers/traffic-provider";
import { weatherProvider } from "@/lib/context-resolver/providers/weather-provider";
import {
  formatRecordClock,
  remindersToScheduleRecords,
} from "@/lib/schedule-intelligence/schedule-record";
import type { ScheduleIntelligenceContext } from "@/lib/schedule-intelligence/types";
import { minutesToClock } from "@/lib/schedule/schedule-time-utils";

function findMeetingRecord(
  context: ScheduleIntelligenceContext,
  analysis: ScheduleQueryAnalysis
) {
  const records = remindersToScheduleRecords(context.reminders);
  const dateKey = analysis.dateKey ?? context.referenceDate;

  if (analysis.meetingMinutes != null) {
    const match = records.find(
      (item) =>
        item.dateKey === dateKey &&
        Math.abs(item.startMinutes - analysis.meetingMinutes!) <= 15
    );
    if (match) {
      return match;
    }
  }

  const dayRecords = records.filter((item) => item.dateKey === dateKey);
  return dayRecords.find((item) => /미팅|회의|약속/u.test(item.title)) ?? dayRecords[0];
}

/** Tier 2 — departure time with traffic buffer (rule engine). */
export async function resolveDepartureAdvice(input: {
  analysis: ScheduleQueryAnalysis;
  context: ScheduleIntelligenceContext;
}): Promise<DepartureAdviceWire | null> {
  const destination = input.analysis.destination ?? "목적지";
  const record = findMeetingRecord(input.context, input.analysis);

  const meetingMinutes =
    input.analysis.meetingMinutes ??
    record?.startMinutes ??
    14 * 60 + 30;

  const dateKey = input.analysis.dateKey ?? input.context.referenceDate;
  const meetingIso = `${dateKey}T${minutesToClock(meetingMinutes)}:00`;

  const event = {
    id: record?.id ?? "departure-query",
    title: record?.title ?? "미팅",
    start_time: meetingIso,
    location: destination,
    meeting_url: null,
    origin_hint: "현재 위치",
  };

  const traffic = await trafficProvider.resolve({ event, now: new Date() });
  const weather = await weatherProvider.resolve({ event, now: new Date() });
  const leave = computeLeaveTime({
    event,
    context: { traffic, weather },
    now: new Date(),
  });

  const leaveBy = formatLeaveTimeClock(leave.show_at);
  const meetingTime =
    record != null
      ? `${formatRecordClock(record)} ${record.title}`
      : formatLeaveTimeClock(leave.meeting_time);

  return {
    destination,
    meetingTime,
    leaveBy,
    travelMinutes: leave.travel_minutes,
    delayMinutes: leave.traffic_delay_minutes,
    bufferMinutes: leave.safety_buffer_minutes,
    summary: `${destination}에서 ${meetingTime} 미팅까지 — 교통·여유 포함 ${leave.total_lead_minutes}분 전, **${leaveBy}**쯤 출발하는 게 안전해요.`,
  };
}
