import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import {
  DEFAULT_SAFETY_BUFFER_MIN,
  WEATHER_RAIN_EXTRA_BUFFER_MIN,
  type ContextSnapshot,
  type PersistentEvent,
} from "@/lib/context-resolver/types";

export type LeaveTimeInput = {
  event: PersistentEvent;
  context: ContextSnapshot;
  now?: Date;
};

export type LeaveTimeResult = {
  meeting_time: Date;
  show_at: Date;
  travel_minutes: number;
  traffic_delay_minutes: number;
  safety_buffer_minutes: number;
  total_lead_minutes: number;
};

/**
 * Rule Engine — no LLM.
 * leaveTime = meetingTime - travelTime - trafficDelay - safetyBuffer
 */
export function computeLeaveTime(input: LeaveTimeInput): LeaveTimeResult {
  const meeting =
    parseActionTargetDatetime(input.event.start_time) ??
    new Date(input.event.start_time);

  const travelMinutes = input.context.traffic.travel_minutes;
  const trafficDelayMinutes = input.context.traffic.delay_minutes;
  let safetyBufferMinutes =
    input.event.safety_buffer_minutes ?? DEFAULT_SAFETY_BUFFER_MIN;

  if (input.context.weather.condition === "rain") {
    safetyBufferMinutes += WEATHER_RAIN_EXTRA_BUFFER_MIN;
  }

  const totalLeadMinutes = travelMinutes + trafficDelayMinutes + safetyBufferMinutes;
  const showAt = new Date(meeting.getTime() - totalLeadMinutes * 60_000);

  return {
    meeting_time: meeting,
    show_at: showAt,
    travel_minutes: travelMinutes,
    traffic_delay_minutes: trafficDelayMinutes,
    safety_buffer_minutes: safetyBufferMinutes,
    total_lead_minutes: totalLeadMinutes,
  };
}

export function formatLeaveTimeClock(iso: Date): string {
  return iso.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
