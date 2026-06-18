"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { AuthLogoutButton } from "@/components/auth-logout-button";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type AuthPanelProps = {
  className?: string;
  nextPath?: string;
  /** Hide outer card; parent supplies section chrome */
  variant?: "card" | "embedded";
};

export function AuthPanel({
  className,
  nextPath = "/",
  variant = "card",
}: AuthPanelProps) {
  const copy = useCopy();
  const { user, loading, configured, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth === "error") {
      toast.error(copy.auth.loginFail, {
        description: copy.auth.loginFailHint,
      });
    } else if (auth === "missing_code") {
      toast.error(copy.auth.loginIncomplete);
    }
  }, [searchParams, copy]);

  if (!configured) {
    return null;
  }

  const wrap = (children: ReactNode) =>
    variant === "embedded" ? (
      <div className={className}>{children}</div>
    ) : (
      <section
        className={cn(
          "rounded-2xl border border-white/[0.06] bg-rimvio-surface/90 p-4",
          className,
        )}
      >
        {children}
      </section>
    );

  if (loading) {
    return wrap(
      <p className="text-[13px] text-muted-foreground">{copy.auth.checking}</p>,
    );
  }

  if (user) {
    const label =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email ??
      copy.auth.guestName;

    return wrap(
      <>
        <p className="text-[14px] font-medium text-foreground">{label}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {copy.auth.loggedInAs(label)}
        </p>
        <AuthLogoutButton className="mt-3" redirectTo="/" />
      </>,
    );
  }

  return wrap(
    <>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {copy.auth.loginHint}
      </p>
      <GoogleSignInButton
        className="mt-3"
        label={copy.auth.googleContinue}
        busy={busy}
        onClick={() => {
          setBusy(true);
          void signInWithGoogle(nextPath)
            .catch(() => {
              toast.error(copy.auth.loginFail, {
                description: copy.auth.loginFailHint,
              });
              setBusy(false);
            });
        }}
      />
    </>,
  );
}
