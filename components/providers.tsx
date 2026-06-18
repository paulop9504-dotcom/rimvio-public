"use client";

import "@/lib/demo/experiment-lab-init";
import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/use-auth";
import { RimvioAuthProfileBootstrap } from "@/components/rimvio-auth-profile-bootstrap";
import { RimvioProfileSetupGate } from "@/components/rimvio-profile-setup-gate";
import { isAuthRequired } from "@/lib/auth/policy";
import { AutoLocaleBootstrap } from "@/components/auto-locale-bootstrap";
import { DevDemoSeed } from "@/components/dev-demo-seed";
import { ExperimentLabBootstrap } from "@/components/experiment-lab-bootstrap";
import { IosShareBanner } from "@/components/ios-share-banner";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import type { AppLocale } from "@/lib/i18n/types";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ReminderPoller } from "@/components/reminder-poller";
import { ServiceWorkerBootstrap } from "@/components/service-worker-bootstrap";
import { NativeBridgeBoot } from "@/components/native-bridge-boot";
import { GpsPingBootstrap } from "@/components/gps-ping-bootstrap";
import { GoogleCalendarSyncBootstrap } from "@/components/google-calendar-sync-bootstrap";
import { ExperienceGravityBootstrap } from "@/components/experience-gravity-bootstrap";
import { AlbumSyncBootstrap } from "@/components/album-sync-bootstrap";
import { AlbumSyncProgressChip } from "@/components/album-sync-progress-chip";
import { Toaster } from "@/components/ui/sonner";

type ProvidersProps = {
  children: React.ReactNode;
  initialLocale: AppLocale;
};

export function Providers({ children, initialLocale }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <LocaleProvider initialLocale={initialLocale}>
        <AuthProvider>
          <RimvioAuthProfileBootstrap />
          <AutoLocaleBootstrap />
          <Suspense fallback={null}>
            <ExperimentLabBootstrap />
          </Suspense>
          {!isAuthRequired() ? <DevDemoSeed /> : null}
          <IosShareBanner />
          <GpsPingBootstrap />
          <GoogleCalendarSyncBootstrap />
          <ExperienceGravityBootstrap />
          <AlbumSyncBootstrap />
          <AlbumSyncProgressChip />
          <RimvioProfileSetupGate>{children}</RimvioProfileSetupGate>
          <ReminderPoller />
          <ServiceWorkerBootstrap />
          <NativeBridgeBoot />
          <PwaInstallPrompt />
        </AuthProvider>
      </LocaleProvider>
      <Toaster />
    </ThemeProvider>
  );
}
