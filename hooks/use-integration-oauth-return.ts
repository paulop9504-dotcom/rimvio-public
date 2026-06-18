"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import { useGoogleCalendarSync } from "@/hooks/use-google-calendar-sync";
import { useIntegrations } from "@/hooks/use-integrations";

type UseIntegrationOAuthReturnOptions = {
  enabled?: boolean;
  onGoogleConnected?: () => void;
};

export function useIntegrationOAuthReturn({
  enabled = true,
  onGoogleConnected,
}: UseIntegrationOAuthReturnOptions = {}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const copy = useCopy();
  const { sync: syncIntegrations } = useIntegrations();
  const { sync: syncGoogleCalendar } = useGoogleCalendarSync();
  const handledKey = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const status = searchParams.get("integration");
    if (!status) {
      return;
    }

    const provider = searchParams.get("provider") ?? undefined;
    const key = `${status}:${provider ?? ""}:${searchParams.toString()}`;
    if (handledKey.current === key) {
      return;
    }
    handledKey.current = key;

    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("integration");
    sp.delete("provider");
    sp.delete("reason");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

    if (status === "connected" && provider) {
      toast.success(
        provider === "google_calendar"
          ? copy.calendar.connectSuccess
          : copy.settings.integrationsOAuthSuccess(provider),
      );
      void syncIntegrations();
      if (provider === "google_calendar") {
        void syncGoogleCalendar()
          .then((count) => {
            toast.success(copy.calendar.syncSuccess(count));
            onGoogleConnected?.();
          })
          .catch(() => {});
      }
      return;
    }

    if (status === "login_required") {
      toast.message(copy.settings.integrationsLoginRequired);
      return;
    }

    if (status === "error") {
      toast.error(copy.settings.integrationsOAuthFail);
    }
  }, [
    copy,
    enabled,
    onGoogleConnected,
    pathname,
    router,
    searchParams,
    syncGoogleCalendar,
    syncIntegrations,
  ]);
}
