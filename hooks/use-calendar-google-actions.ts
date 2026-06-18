"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import { useGoogleCalendarSync } from "@/hooks/use-google-calendar-sync";
import { useIntegrations } from "@/hooks/use-integrations";
import { markGoogleCalendarAutoSynced } from "@/lib/google-calendar/sync-throttle";

export const CALENDAR_OAUTH_RETURN_PATH = "/search?calendar=full";
export const CALENDAR_SHEET_OAUTH_RETURN_PATH = "/search?calendar=sheet";

export function useCalendarGoogleActions() {
  const copy = useCopy();
  const router = useRouter();
  const { isConnected, oauthConfigured, startOAuth } = useIntegrations();
  const { sync, syncing } = useGoogleCalendarSync();

  const available = oauthConfigured.google_calendar;
  const connected = isConnected("google_calendar");

  const runSync = useCallback(async () => {
    try {
      const count = await sync();
      markGoogleCalendarAutoSynced();
      toast.success(copy.calendar.syncSuccess(count));
      return count;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : copy.calendar.syncFail,
      );
      throw error;
    }
  }, [copy, sync]);

  const connectGoogle = useCallback(
    (returnPath = CALENDAR_OAUTH_RETURN_PATH) => {
      startOAuth("google_calendar", returnPath);
    },
    [startOAuth],
  );

  const openIntegrations = useCallback(() => {
    router.push("/welcome#integrations");
  }, [router]);

  const openFullCalendar = useCallback(() => {
    router.push("/search?calendar=full");
  }, [router]);

  const talkSchedule = useCallback(() => {
    router.push("/search");
  }, [router]);

  return {
    available,
    connected,
    syncing,
    runSync,
    connectGoogle,
    openIntegrations,
    openFullCalendar,
    talkSchedule,
  };
}
