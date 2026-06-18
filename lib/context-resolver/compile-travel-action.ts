import { buildScheduledPlaceNavActions } from "@/lib/action-chat/scheduled-action-delivery";
import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import {
  computeLeaveTime,
  formatLeaveTimeClock,
} from "@/lib/context-resolver/leave-time-engine";
import { persistentEventFromExtracted } from "@/lib/context-resolver/event-from-schedule";
import { resolveDynamicContext } from "@/lib/context-resolver/resolve-context";
import type {
  CompiledTravelAction,
  ContextResolveInput,
  PersistentEvent,
} from "@/lib/context-resolver/types";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { buildTmapNavigateHref } from "@/lib/actions/domain-deep-links";

function buildNavigationActions(
  event: PersistentEvent,
  extracted: ConfirmationExtractedData
) {
  const navActions = buildScheduledPlaceNavActions(extracted);
  const tmapHref = buildTmapNavigateHref(event.location);

  const tmapAction = createOpenAction({
    label: "티맵 열기",
    href: tmapHref,
    icon: "navigation",
  });

  const hasTmap = navActions.some((action) => /tmap|티맵/i.test(`${action.label} ${action.href ?? ""}`));
  if (hasTmap) {
    return navActions;
  }

  return [tmapAction, ...navActions];
}

function buildSummary(input: {
  event: PersistentEvent;
  leave: ReturnType<typeof computeLeaveTime>;
  context: CompiledTravelAction["context"];
}): { summary: string; reason: string } {
  const { weather, traffic } = input.context;
  const showClock = formatLeaveTimeClock(input.leave.show_at);
  const weatherNote =
    weather.is_unpleasant || weather.condition === "rain" ? "비·날씨 부담, " : "";
  const delayNote =
    traffic.delay_minutes > 0 ? `교통 지연 ${traffic.delay_minutes}분, ` : "";

  return {
    summary: `🚗 지금 출발해야 합니다 (${weatherNote}${delayNote}이동 약 ${traffic.travel_minutes}분)`,
    reason: `${input.event.title} ${formatLeaveTimeClock(input.leave.meeting_time)} · 출발 권장 ${showClock}`,
  };
}

/** (Event Snapshot) + (Context Snapshot) → Action via Rule Engine */
export async function compileTravelAction(input: {
  event: PersistentEvent;
  extracted: ConfirmationExtractedData;
  now?: Date;
  context?: CompiledTravelAction["context"];
}): Promise<CompiledTravelAction> {
  const resolveInput: ContextResolveInput = {
    event: input.event,
    now: input.now,
  };
  const context = input.context ?? (await resolveDynamicContext(resolveInput));
  const leave = computeLeaveTime({ event: input.event, context, now: input.now });

  const actionType = input.event.meeting_url?.includes("zoom")
    ? ("JOIN_MEETING" as const)
    : ("OPEN_NAVIGATION" as const);

  const copy = buildSummary({ event: input.event, leave, context });

  return {
    show_at: leave.show_at.toISOString(),
    action: actionType,
    summary: copy.summary,
    reason: copy.reason,
    context,
    actions: buildNavigationActions(input.event, input.extracted),
  };
}

export async function compileJITTravelFire(
  extracted: ConfirmationExtractedData,
  options?: { now?: Date; originHint?: string | null }
): Promise<CompiledTravelAction | null> {
  const event = persistentEventFromExtracted(extracted, { originHint: options?.originHint });
  if (!event) {
    return null;
  }

  return compileTravelAction({
    event,
    extracted,
    now: options?.now,
  });
}

export async function planJITShowAt(
  extracted: ConfirmationExtractedData,
  options?: { now?: Date; originHint?: string | null }
): Promise<{ show_at: string; event: PersistentEvent } | null> {
  const event = persistentEventFromExtracted(extracted, { originHint: options?.originHint });
  if (!event) {
    return null;
  }

  const context = await resolveDynamicContext({ event, now: options?.now });
  const leave = computeLeaveTime({ event, context, now: options?.now });

  return {
    show_at: leave.show_at.toISOString(),
    event,
  };
}
