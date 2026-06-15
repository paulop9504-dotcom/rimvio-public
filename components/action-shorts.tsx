import { Suspense } from "react";
import { ActionShortsFeed } from "@/components/action-shorts-feed";
import { ActionCardSkeleton } from "@/components/action-card-skeleton";
import { RealtimeLinksProvider } from "@/hooks/use-realtime-links";
import { getAuthUserId } from "@/lib/auth/session";
import { fetchLinks } from "@/lib/data/fetch-links";

export async function ActionShorts() {
  const [links, userId] = await Promise.all([fetchLinks(), getAuthUserId()]);

  return (
    <RealtimeLinksProvider initialLinks={links} userId={userId}>
      <Suspense fallback={<ActionCardSkeleton />}>
        <ActionShortsFeed />
      </Suspense>
    </RealtimeLinksProvider>
  );
}
