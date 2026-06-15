import { AppShell } from "@/components/app-shell";
import { DemoLauncher } from "@/components/demo-launcher";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { RIMVIO } from "@/lib/brand/rimvio";

export default function DemoPage() {
  return (
    <AppShell title="Demo" subtitle={`${RIMVIO.name} 미리보기`}>
      <AnalyticsPanel />
      <DemoLauncher />
    </AppShell>
  );
}
