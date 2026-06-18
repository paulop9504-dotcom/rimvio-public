"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { RimvioLogo } from "@/components/rimvio-logo";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { isAuthGateBypass } from "@/lib/auth/protected-routes";
import { isAuthRequired } from "@/lib/auth/policy";

type AuthGateProps = {
  children: ReactNode;
};

function AuthGateLoading() {
  const copy = useCopy();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-rimvio-base px-6">
      <RimvioLogo size="md" appearance="white" />
      <p className="text-[13px] text-muted-foreground">{copy.auth.checking}</p>
    </div>
  );
}

/**
 * Runs before every page: when AUTH_REQUIRED and no session, show LoginScreen.
 */
export function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (!isAuthRequired()) {
    return <div key={pathname}>{children}</div>;
  }

  if (isAuthGateBypass(pathname)) {
    return <div key={pathname}>{children}</div>;
  }

  if (loading) {
    return <AuthGateLoading />;
  }

  if (!user) {
    return (
      <Suspense fallback={<AuthGateLoading />}>
        <LoginScreen />
      </Suspense>
    );
  }

  return <div key={pathname}>{children}</div>;
}
