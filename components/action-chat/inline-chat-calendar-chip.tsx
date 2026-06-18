"use client";

import { Calendar } from "lucide-react";
import { CalendarBoard } from "@/components/action-chat/calendar-board";
import type { InlineChatCalendarWire } from "@/lib/action-chat/mention-calendar/inline-chat-calendar";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import {
  rimvioInlineChipClass,
  rimvioInlineChipHeaderClass,
  rimvioInlineChipMetaClass,
  rimvioInlineChipTitleClass,
} from "@/lib/brand/rimvio-neon-theme";
import { cn } from "@/lib/utils";

type InlineChatCalendarChipProps = {
  calendar: InlineChatCalendarWire;
  overlayRows: UnifiedCalendarOverlayRow[];
  contextByMessageId?: Record<string, string>;
  onExpand?: () => void;
  onSpawnPrompt?: (uri: string) => void;
  className?: string;
};

export function InlineChatCalendarChip({
  calendar,
  overlayRows,
  contextByMessageId,
  onExpand,
  onSpawnPrompt,
  className,
}: InlineChatCalendarChipProps) {
  return (
    <div
      className={cn(rimvioInlineChipClass("lg"), className)}
      aria-label="캘린더"
    >
      <div className={rimvioInlineChipHeaderClass}>
        <Calendar className="size-4 shrink-0 text-rimvio-neon-amber" aria-hidden />
        <span className={rimvioInlineChipTitleClass}>캘린더</span>
        {calendar.query ? (
          <span className={rimvioInlineChipMetaClass}>{calendar.query}</span>
        ) : null}
      </div>
      <CalendarBoard
        variant="compact"
        overlayRows={overlayRows}
        contextByMessageId={contextByMessageId}
        compactTitle="다가오는 일정"
        onExpand={onExpand}
        onSpawnPrompt={onSpawnPrompt}
        className="rounded-none border-0 shadow-none"
      />
    </div>
  );
}
