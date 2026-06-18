import { AppShell } from "@/components/app-shell";
import { PmfMetricsPanel } from "@/components/pmf-metrics-panel";
import { AnalyticsPanel } from "@/components/analytics-panel";

export default function MetricsPage() {
  return (
    <AppShell title="Metrics" subtitle="PMF core · dev surface">
      <div className="space-y-6">
        <PmfMetricsPanel />
        <AnalyticsPanel />
      </div>
    </AppShell>
  );
}
