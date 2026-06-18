"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Link2, Maximize2, RefreshCw, Settings2 } from "lucide-react";
import { CalendarScheduleOriginBadge } from "@/components/action-chat/calendar-schedule-origin-badge";
import { useCopy } from "@/hooks/use-copy";
import { useCalendarGoogleActions } from "@/hooks/use-calendar-google-actions";
import {
  calendarOAuthReturnPath,
  type CalendarOAuthSurface,
} from "@/lib/calendar/calendar-oauth-return-path";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

type CalendarToolbarProps = {
  variant?: "page" | "sheet" | "compact";
  showLegend?: boolean;
  showFullScreenLink?: boolean;
  onOpenFullScreen?: () => void;
  /** OAuth lands back on this calendar surface (sheet vs full). */
  oauthSurface?: CalendarOAuthSurface;
  oauthReturnPath?: string;
  className?: string;
};

export function CalendarToolbar({
  variant = "page",
  showLegend = true,
  showFullScreenLink = false,
  onOpenFullScreen,
  oauthSurface,
  oauthReturnPath,
  className,
}: CalendarToolbarProps) {
  const copy = useCopy();
  const pathname = usePathname();
  const resolvedOauthReturnPath = useMemo(() => {
    if (oauthReturnPath) {
      return oauthReturnPath;
    }
    const surface: CalendarOAuthSurface =
      oauthSurface ?? (showFullScreenLink ? "sheet" : variant === "page" ? "full" : "sheet");
    return calendarOAuthReturnPath(surface, pathname);
  }, [oauthReturnPath, oauthSurface, pathname, showFullScreenLink, variant]);
  const {
    available,
    connected,
    syncing,
    runSync,
    connectGoogle,
    openIntegrations,
    openFullCalendar,
  } = useCalendarGoogleActions();

  const compact = variant === "compact";

  return (
    <div className={cn("space-y-2", className)}>
      {showLegend ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground",
            compact && "text-[9px]",
          )}
        >
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex size-3 rounded-sm bg-[#0D9488]" aria-hidden />
            <CalendarScheduleOriginBadge origin="rimvio" size="xs" />
            <span>{copy.calendar.originRimvio}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-flex size-3 rounded-sm border border-[#4285F4]/60 bg-[#4285F4]/15"
              aria-hidden
            />
            <CalendarScheduleOriginBadge origin="google_calendar" size="xs" />
            <span>{copy.calendar.originGoogle}</span>
          </span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        {variant === "page" ? (
          <p className="min-w-0 text-[12px] leading-snug text-muted-foreground sm:text-[13px]">
            {copy.calendar.pageHint}
          </p>
        ) : (
          <span className="sr-only">{copy.nav.calendar}</span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {showFullScreenLink ? (
            <button
              type="button"
              onClick={() => {
                if (onOpenFullScreen) {
                  onOpenFullScreen();
                  return;
                }
                openFullCalendar();
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
                IOS.secondaryBtn,
              )}
            >
              <Maximize2 className="size-3.5" />
              {copy.calendar.fullScreen}
            </button>
          ) : null}

          {available ? (
            <button
              type="button"
              disabled={connected && syncing}
              onClick={() => {
                if (connected) {
                  void runSync();
                  return;
                }
                connectGoogle(resolvedOauthReturnPath);
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
                IOS.primaryBtn,
                "h-auto min-h-0 w-auto py-2",
              )}
            >
              <RefreshCw className={cn("size-3.5", connected && syncing && "animate-spin")} />
              {connected
                ? syncing
                  ? copy.calendar.syncing
                  : copy.calendar.syncShort
                : copy.calendar.syncShort}
            </button>
          ) : null}

          {available ? (
            <button
              type="button"
              onClick={() => {
                if (connected) {
                  openIntegrations();
                  return;
                }
                connectGoogle(resolvedOauthReturnPath);
              }}
              aria-label={
                connected ? copy.calendar.settingsIntegrations : copy.calendar.integrations
              }
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
                connected ? IOS.secondaryBtn : IOS.primaryBtn,
                !connected && "h-auto min-h-0 w-auto py-2",
              )}
            >
              {connected ? (
                <Settings2 className="size-3.5" />
              ) : (
                <Link2 className="size-3.5" />
              )}
              {compact ? null : copy.calendar.integrations}
            </button>
          ) : (
            <span className="rounded-lg bg-secondary px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground">
              {copy.calendar.oauthSetupPending}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
