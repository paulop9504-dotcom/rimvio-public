import { Suspense } from "react";
import { ActionFeed } from "@/components/action-feed";
import { ActionCardSkeletonList } from "@/components/action-card-skeleton";
import { AppShell } from "@/components/app-shell";

import { getServerCopy } from "@/lib/i18n/server-locale";

export default async function InboxPage() {
  const copy = await getServerCopy();
  return (
    <AppShell title={copy.inbox.title} hideTitle compact iosSurface>
      <Suspense fallback={<ActionCardSkeletonList count={3} />}>
        <ActionFeed />
      </Suspense>
    </AppShell>
  );
}
