"use client";

import { useMemo } from "react";
import { useCopy } from "@/hooks/use-copy";
import {
  googleCalendarOAuthConsoleUrl,
  googleCalendarOAuthRedirectUri,
} from "@/lib/google-calendar/oauth-setup";
import { cn } from "@/lib/utils";

type GoogleCalendarOAuthSetupHintProps = {
  className?: string;
};

export function GoogleCalendarOAuthSetupHint({
  className,
}: GoogleCalendarOAuthSetupHintProps) {
  const copy = useCopy();

  const redirectUri = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/integrations/oauth/callback`;
    }
    return googleCalendarOAuthRedirectUri();
  }, []);

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3",
        className,
      )}
    >
      <p className="text-[13px] font-semibold text-amber-100/95">
        {copy.calendar.oauthSetupTitle}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-amber-100/70">
        {copy.calendar.oauthSetupBody}
      </p>
      <p className="mt-2 text-[11px] font-medium text-muted-foreground">
        {copy.calendar.oauthSetupRedirectLabel}
      </p>
      <code className="mt-1 block break-all rounded-lg bg-black/25 px-2 py-1.5 text-[11px] text-[#93C5FD]">
        {redirectUri}
      </code>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {copy.calendar.oauthSetupScriptHint} ·{" "}
        <a
          href={googleCalendarOAuthConsoleUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#93C5FD] underline-offset-2 hover:underline"
        >
          Google Cloud Console
        </a>
      </p>
    </div>
  );
}
