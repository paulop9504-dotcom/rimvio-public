import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { RimvioProfileSetupWizard } from "@/components/rimvio-profile-setup-wizard";

export default function OnboardingPage() {
  return (
    <AppShell title="시작하기" compact hideBottomNav iosSurface>
      <Suspense fallback={null}>
        <RimvioProfileSetupWizard />
      </Suspense>
    </AppShell>
  );
}
