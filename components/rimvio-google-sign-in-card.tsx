"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type RimvioGoogleSignInCardProps = {
  className?: string;
  /** 로그인 후 이동 경로 (기본: 프로필 설정) */
  nextPath?: string;
  compact?: boolean;
};

/** Google 간편 로그인 — ROOM·피드 등 게스트 구간 */
export function RimvioGoogleSignInCard({
  className,
  nextPath = "/onboarding",
  compact = false,
}: RimvioGoogleSignInCardProps) {
  const copy = useCopy();
  const ps = copy.profileSetup;
  const pathname = usePathname();
  const { configured, user, loading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!configured || loading || user) {
    return null;
  }

  const resolvedNext =
    nextPath ||
    (pathname?.startsWith("/peers") ? "/onboarding" : pathname || "/feed");

  return (
    <section
      className={cn(
        "rounded-2xl border border-[#FEE500]/25 bg-gradient-to-br from-[#FEE500]/12 via-rimvio-surface to-rimvio-surface p-4",
        className,
      )}
      aria-label={ps.googleCardTitle}
    >
      <p className="text-[15px] font-semibold text-white">{copy.product.oneLiner}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-white/60">
        {ps.googleCardBody}
      </p>
      <GoogleSignInButton
        className={cn(compact ? "mt-2.5" : "mt-4")}
        size={compact ? "sm" : "md"}
        label={copy.auth.googleLogin}
        busy={busy}
        onClick={() => {
          setBusy(true);
          void signInWithGoogle(resolvedNext)
            .catch(() => {
              toast.error(copy.auth.loginFail, {
                description: copy.auth.loginFailHint,
              });
              setBusy(false);
            });
        }}
      />
      <p className="mt-2 text-[10px] text-white/45">{ps.googleCardFoot}</p>
    </section>
  );
}
