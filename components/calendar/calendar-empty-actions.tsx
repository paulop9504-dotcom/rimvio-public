"use client";

import { MessageSquarePlus } from "lucide-react";
import { CalendarGoogleConnectBanner } from "@/components/calendar/calendar-google-connect-banner";
import { useCopy } from "@/hooks/use-copy";
import { useCalendarGoogleActions } from "@/hooks/use-calendar-google-actions";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

type CalendarEmptyActionsProps = {
  compact?: boolean;
  className?: string;
};

export function CalendarEmptyActions({
  compact,
  className,
}: CalendarEmptyActionsProps) {
  const copy = useCopy();
  const { available, connected, talkSchedule, connectGoogle } =
    useCalendarGoogleActions();

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border bg-secondary/60 px-4 py-8 text-center",
          compact && "py-5",
        )}
      >
        <p className="text-[14px] font-medium leading-snug text-foreground">
          {copy.calendar.emptyTitle}
        </p>
        <p className="mx-auto mt-2 max-w-[18rem] text-[12px] leading-5 text-muted-foreground">
          {copy.calendar.emptyBody}
        </p>
        <div className="mx-auto mt-4 flex max-w-[16rem] flex-col gap-2">
          <button
            type="button"
            onClick={talkSchedule}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 text-[13px] font-semibold",
              IOS.primaryBtn,
            )}
          >
            <MessageSquarePlus className="size-4" />
            {copy.calendar.talkSchedule}
          </button>
          {available && !connected ? (
            <button
              type="button"
              onClick={connectGoogle}
              className={cn(
                "inline-flex h-10 items-center justify-center text-[12px] font-medium",
                IOS.secondaryBtn,
                "w-full px-4",
              )}
            >
              {copy.calendar.connectGoogle}
            </button>
          ) : null}
        </div>
      </div>

      {available && !connected ? (
        <CalendarGoogleConnectBanner />
      ) : null}
    </div>
  );
}
