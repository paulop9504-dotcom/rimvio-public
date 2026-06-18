import { Suspense } from "react";
import { ActionStack } from "@/components/action-stack";
import { ActionCardSkeleton } from "@/components/action-card-skeleton";
import { AppShell } from "@/components/app-shell";

export default function StackPage() {
  return (
    <AppShell title="Stack" subtitle="One card focus">
      <Suspense fallback={<ActionCardSkeleton />}>
        <ActionStack />
      </Suspense>
    </AppShell>
  );
}
