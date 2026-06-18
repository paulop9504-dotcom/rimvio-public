import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type {
  CalendarContext,
  ContextProvider,
  ContextResolveInput,
} from "@/lib/context-resolver/types";

/** CalendarProvider — event-relative clock context. */
export class CalendarProvider implements ContextProvider<CalendarContext> {
  readonly id = "calendar";

  async resolve(input: ContextResolveInput): Promise<CalendarContext> {
    const now = input.now ?? new Date();
    const meeting = parseActionTargetDatetime(input.event.start_time) ?? now;
    const minutesUntil = Math.max(
      0,
      Math.round((meeting.getTime() - now.getTime()) / 60_000)
    );

    return {
      current_time: now.toISOString(),
      minutes_until_event: minutesUntil,
      event_title: input.event.title,
    };
  }
}

export const calendarProvider = new CalendarProvider();
