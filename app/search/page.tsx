import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ActionSearchHub } from "@/components/search/action-search-hub";
import { ActionCardSkeleton } from "@/components/action-card-skeleton";
import { getServerCopy } from "@/lib/i18n/server-locale";

export default async function SearchPage() {
  const copy = await getServerCopy();
  return (
    <AppShell
      title={copy.search.title}
      subtitle={copy.search.subtitle}
      immersive
      hideBranding
    >
      <Suspense fallback={<ActionCardSkeleton />}>
        <ActionSearchHub />
      </Suspense>
    </AppShell>
  );
}
