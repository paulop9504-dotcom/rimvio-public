"use client";

import { useEffect } from "react";
import { AuxSeedButton } from "@/components/action-chat/aux-seed-button";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import {
  recordOverlayActionTelemetry,
  recordOverlayActionsShown,
  foldOverlayLearningForEvent,
} from "@/lib/archive/record-action-telemetry";
import { ActionDockWhyLine } from "@/components/action-dock/action-dock-why-line";
import { cn } from "@/lib/utils";
import { CalendarScheduleOriginBadge } from "@/components/action-chat/calendar-schedule-origin-badge";
import type {
  CalendarEventChip,
  CalendarOverlayAction,
} from "@/lib/calendar/calendar-view-types";
import { calendarEventChipClass } from "@/lib/calendar/resolve-calendar-schedule-origin";

function padTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

type OverlayEventChipProps = {
  event: CalendarEventChip;
  overlayActions: readonly CalendarOverlayAction[];
  context_lines?: readonly string[];
  prompt_hint?: string;
  compact?: boolean;
  onEventSelect?: (event: CalendarEventChip) => void;
  onActionSelect?: (action: CalendarOverlayAction) => void;
  onSpawnPrompt?: (uri: string) => void;
  className?: string;
  telemetrySurface?: string;
  telemetryPhase?: string;
};

function partitionOverlayActions(actions: readonly CalendarOverlayAction[]) {
  const hasTier = actions.some((action) => action.action_tier);
  if (!hasTier) {
    return { mainAction: null as CalendarOverlayAction | null, auxActions: [...actions] };
  }

  const mainAction = actions.find((action) => action.action_tier === "MAIN") ?? null;
  const auxActions = actions.filter((action) => action.action_tier !== "MAIN");
  return { mainAction, auxActions };
}

export function OverlayEventChip({
  event,
  overlayActions,
  context_lines = [],
  prompt_hint,
  compact,
  onEventSelect,
  onActionSelect,
  onSpawnPrompt,
  className,
  telemetrySurface = "overlay",
  telemetryPhase,
}: OverlayEventChipProps) {
  const timeLabel = event.hasTime ? padTime(event.hour, event.minute) : null;
  const elapsedLabel =
    event.entry?.kind === "study_focus" ? event.entry.countdownLabel : null;
  const isStandaloneAction = event.layer === "action" && overlayActions.length === 0;
  const { mainAction, auxActions } = partitionOverlayActions(overlayActions);

  useEffect(() => {
    const eventId = event.eventId;
    if (!eventId || overlayActions.length === 0) {
      return;
    }
    recordOverlayActionsShown({
      eventId,
      actions: overlayActions,
      surface: telemetrySurface,
      phase: telemetryPhase,
    });
  }, [event.eventId, overlayActions, telemetryPhase, telemetrySurface]);

  const handleAction = (action: CalendarOverlayAction) => {
    const eventId = event.eventId;
    if (eventId) {
      recordOverlayActionTelemetry({
        eventId,
        action,
        kind: "clicked",
        surface: telemetrySurface,
        phase: telemetryPhase,
      });
    }
    if (action.deeplink) {
      if (eventId) {
        recordOverlayActionTelemetry({
          eventId,
          action,
          kind: "executed",
          surface: telemetrySurface,
          phase: telemetryPhase,
        });
        foldOverlayLearningForEvent(eventId);
      }
      openSpawnAction({
        deeplink: action.deeplink,
        onPrompt: onSpawnPrompt,
      });
    }
    onActionSelect?.(action);
  };

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {context_lines.map((line) => (
        <p
          key={line}
          className="px-0.5 text-[11px] leading-snug text-[#9CA3AF]"
        >
          {line}
        </p>
      ))}

      <button
        type="button"
        onClick={() => onEventSelect?.(event)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12px] font-medium leading-tight transition-opacity hover:opacity-90",
          calendarEventChipClass(event),
          compact && "py-1 text-[11px]",
        )}
      >
        {event.layer === "event" ? (
          <CalendarScheduleOriginBadge
            origin={event.scheduleOrigin}
            size={compact ? "xs" : "sm"}
          />
        ) : null}
        {timeLabel ? <span className="shrink-0 opacity-80">{timeLabel}</span> : null}
        <span className="min-w-0 truncate">{event.title}</span>
      </button>

      {elapsedLabel ? (
        <p className="px-0.5 text-[11px] font-medium tabular-nums text-[#93C5FD]">
          ⏱ {elapsedLabel}
        </p>
      ) : null}

      {isStandaloneAction && event.entry?.subtitle && !elapsedLabel ? (
        <p className="px-0.5 text-[11px] text-[#9CA3AF]">{event.entry.subtitle}</p>
      ) : null}

      {prompt_hint ? (
        <p className="px-0.5 text-[12px] font-medium text-[#CBD5E1]">{prompt_hint}</p>
      ) : null}

      {mainAction ? (
        <div className="space-y-1">
          <MainActionButton
            label={mainAction.label}
            brand={resolveMainActionBrandStyle({
              id: mainAction.id,
              label: mainAction.label,
              deeplink: mainAction.deeplink,
              plugin: mainAction.plugin,
            })}
            compact
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              handleAction(mainAction);
            }}
          />
          {mainAction.ranking_why ? (
            <ActionDockWhyLine
              line={mainAction.ranking_why}
              className="px-0.5 text-left"
            />
          ) : null}
        </div>
      ) : null}

      {auxActions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-0.5 pt-0.5">
          {auxActions.map((action) => (
            <AuxSeedButton
              key={action.id}
              label={action.label}
              onClick={() => handleAction(action)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
