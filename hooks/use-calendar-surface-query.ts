"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useIntegrationOAuthReturn } from "@/hooks/use-integration-oauth-return";

type UseCalendarSurfaceQueryOptions = {
  enabled?: boolean;
  onOpenSheet?: () => void;
  onOpenFull?: () => void;
  onGoogleConnected?: () => void;
};

/**
 * Opens calendar sheet/full from `?calendar=sheet|full` and handles OAuth return on the same route.
 */
export function useCalendarSurfaceQuery({
  enabled = true,
  onOpenSheet,
  onOpenFull,
  onGoogleConnected,
}: UseCalendarSurfaceQueryOptions) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const calendar = searchParams.get("calendar");

  useIntegrationOAuthReturn({
    enabled,
    onGoogleConnected,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (calendar === "sheet") {
      onOpenSheet?.();
    } else if (calendar === "full") {
      onOpenFull?.();
    }
  }, [calendar, enabled, onOpenFull, onOpenSheet]);

  const clearCalendarQuery = () => {
    if (!calendar) {
      return;
    }
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("calendar");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return { calendarSurface: calendar, clearCalendarQuery };
}
