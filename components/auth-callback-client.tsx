"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  clearAuthNextCookie,
  readAuthNextPath,
} from "@/lib/auth/redirect-url";
import { resolvePostLoginPathAfterAuth } from "@/lib/onboarding/resolve-post-login-path";
import {
  assessProfileSetup,
  markProfileSetupCompleteLocal,
} from "@/lib/onboarding/profile-setup-state";
import {
  fetchMyAccountProfile,
  syncMyProfileFromAuth,
} from "@/lib/peer-chat/peer-chat-client";
import { isSupabaseConfigured, tryCreateClient } from "@/lib/supabase/client";
import { useCopy } from "@/hooks/use-copy";

/**
 * Browser-side OAuth callback — PKCE verifier lives in client cookies, so
 * exchange must run here (server route handler often misses the verifier).
 */
export function AuthCallbackClient() {
  const copy = useCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    if (!isSupabaseConfigured()) {
      router.replace("/peers?auth=error");
      return;
    }

    const oauthError = searchParams.get("error");
    if (oauthError) {
      console.error(
        "[auth/callback]",
        oauthError,
        searchParams.get("error_description") ?? "",
      );
      router.replace("/peers?auth=error");
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      router.replace("/peers?auth=missing_code");
      return;
    }

    const supabase = tryCreateClient();
    if (!supabase) {
      router.replace("/peers?auth=error");
      return;
    }

    const requestedNext = readAuthNextPath("/onboarding");

    void (async () => {
      let hasSession = false;

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const { data: sessionData } = await supabase.auth.getSession();
        hasSession = Boolean(sessionData.session?.user);
        if (!hasSession) {
          console.error("[auth/callback]", error.message);
          const authCode = error.message.toLowerCase().includes("invalid api key")
            ? "invalid_key"
            : "error";
          router.replace(`/peers?auth=${authCode}`);
          return;
        }
      } else {
        hasSession = true;
      }

      if (!hasSession) {
        router.replace("/peers?auth=error");
        return;
      }

      clearAuthNextCookie();

      let needsSetup = true;
      try {
        await syncMyProfileFromAuth();
        const profile = await fetchMyAccountProfile();
        const assessment = assessProfileSetup({
          rimvioId: profile.rimvioId,
          displayName: profile.displayName,
        });
        needsSetup = assessment.needsSetup;
        if (!assessment.needsSetup) {
          markProfileSetupCompleteLocal();
        }
      } catch (profileError) {
        console.error("[auth/callback] profile sync", profileError);
        needsSetup = true;
      }

      const dest = resolvePostLoginPathAfterAuth({
        requestedNext,
        needsProfileSetup: needsSetup,
      });
      router.replace(dest);
    })();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-rimvio-base px-6">
      <p className="text-[15px] font-medium text-foreground">{copy.auth.checking}</p>
      <p className="text-[13px] text-muted-foreground">Google 로그인 처리 중…</p>
    </div>
  );
}
