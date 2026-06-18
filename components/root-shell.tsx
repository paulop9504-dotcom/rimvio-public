"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { AuthGate } from "@/components/auth-gate";
import { Providers } from "@/components/providers";
import type { AppLocale } from "@/lib/i18n/types";

type RootShellProps = {
  children: ReactNode;
  initialLocale: AppLocale;
};

/** Root layout shell: locale/providers → AuthGate → app pages. */
export function RootShell({ children, initialLocale }: RootShellProps) {
  return (
    <Providers initialLocale={initialLocale}>
      <Suspense fallback={null}>
        <AuthGate>{children}</AuthGate>
      </Suspense>
    </Providers>
  );
}
