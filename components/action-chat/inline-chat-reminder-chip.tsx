"use client";

import { Bell } from "lucide-react";
import {
  rimvioInlineChipClass,
  rimvioInlineChipMetaClass,
  rimvioInlineChipTitleClass,
} from "@/lib/brand/rimvio-neon-theme";
import { cn } from "@/lib/utils";
import type { InlineChatReminderWire } from "@/lib/action-chat/mention-reminder/inline-chat-reminder";

type InlineChatReminderChipProps = {
  reminder: InlineChatReminderWire;
  className?: string;
};

export function InlineChatReminderChip({
  reminder,
  className,
}: InlineChatReminderChipProps) {
  return (
    <div
      className={cn(rimvioInlineChipClass("inline"), className)}
      aria-label="알림 예약"
    >
      <div className="flex items-center gap-2">
        <Bell className="size-4 shrink-0 text-rimvio-neon-amber" aria-hidden />
        <span className={cn(rimvioInlineChipTitleClass, "min-w-0 truncate")}>
          {reminder.title}
        </span>
      </div>
      <p className={cn(rimvioInlineChipMetaClass, "tabular-nums")}>{reminder.whenLabel}</p>
    </div>
  );
}
