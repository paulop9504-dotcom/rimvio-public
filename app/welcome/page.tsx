import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { WelcomeGuide } from "@/components/welcome-guide";
import { RIMVIO } from "@/lib/brand/rimvio";

export default function WelcomePage() {
  return (
    <AppShell title="설정" compact iosSurface>
      <Suspense fallback={null}>
        <WelcomeGuide />
      </Suspense>
    </AppShell>
  );
}
