"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIntegrations } from "@/hooks/use-integrations";
import { INTEGRATIONS_UPDATED } from "@/lib/integrations/integrations-client-store";
import { syncGoogleCalendarToEventStore } from "@/lib/google-calendar/client-sync";
import {
  markGoogleCalendarAutoSynced,
  shouldRunGoogleCalendarAutoSync,
} from "@/lib/google-calendar/sync-throttle";

/** Pull Google Calendar into Event SSOT when connected (throttled per session). */
export function GoogleCalendarSyncBootstrap() {
  const { user, loading: authLoading } = useAuth();
  const { isConnected, loading: integrationsLoading } = useIntegrations();
  const googleCalendarConnected = isConnected("google_calendar");

  useEffect(() => {
    if (authLoading || integrationsLoading || !user) {
      return;
    }
    if (!googleCalendarConnected) {
      return;
    }
    if (!shouldRunGoogleCalendarAutoSync()) {
      return;
    }

    let cancelled = false;

    void syncGoogleCalendarToEventStore()
      .then((count) => {
        if (!cancelled && count >= 0) {
          markGoogleCalendarAutoSynced();
        }
      })
      .catch(() => {
        /* silent — user can sync manually from settings */
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, integrationsLoading, user, googleCalendarConnected]);

  useEffect(() => {
    const onIntegrationsUpdated = () => {
      if (!user || !googleCalendarConnected) {
        return;
      }
      void syncGoogleCalendarToEventStore()
        .then(() => markGoogleCalendarAutoSynced())
        .catch(() => {});
    };

    window.addEventListener(INTEGRATIONS_UPDATED, onIntegrationsUpdated);
    return () => window.removeEventListener(INTEGRATIONS_UPDATED, onIntegrationsUpdated);
  }, [user, googleCalendarConnected]);

  return null;
}
