"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  assessProfileSetup,
  hasCompletedProfileSetupLocal,
  isProfileSetupBypassPath,
  markProfileSetupCompleteLocal,
} from "@/lib/onboarding/profile-setup-state";
import { fetchMyAccountProfile, syncMyProfileFromAuth } from "@/lib/peer-chat/peer-chat-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type RimvioProfileSetupGateProps = {
  children: React.ReactNode;
};

/**
 * 로그인 후 Rimvio ID·이름이 없으면 /onboarding 으로 유도합니다.
 */
export function RimvioProfileSetupGate({ children }: RimvioProfileSetupGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, configured } = useAuth();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!configured || !isSupabaseConfigured() || loading) {
      setChecking(false);
      return;
    }

    if (!user) {
      setChecking(false);
      return;
    }

    if (isProfileSetupBypassPath(pathname)) {
      setChecking(false);
      return;
    }

    if (hasCompletedProfileSetupLocal()) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    setChecking(true);

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setChecking(false);
      }
    }, 8_000);

    void (async () => {
      try {
        await syncMyProfileFromAuth().catch(() => {});
        const profile = await fetchMyAccountProfile();
        const { needsSetup } = assessProfileSetup(profile);
        if (cancelled) {
          return;
        }
        if (!needsSetup) {
          markProfileSetupCompleteLocal();
          setChecking(false);
          return;
        }
        setChecking(false);
        router.replace("/onboarding");
      } catch {
        if (!cancelled) {
          setChecking(false);
        }
      } finally {
        window.clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      setChecking(false);
    };
  }, [configured, loading, user, pathname, router]);

  if (checking && user && configured && !isProfileSetupBypassPath(pathname)) {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">프로필 확인 중…</p>
      </div>
    );
  }

  return children;
}
