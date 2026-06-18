import { Suspense } from "react";
import { ActionStackList } from "@/components/action-stack-list";
import { ActionCardSkeleton } from "@/components/action-card-skeleton";
import { RealtimeLinksProvider } from "@/hooks/use-realtime-links";
import { getAuthUserId } from "@/lib/auth/session";
import { fetchLinks } from "@/lib/data/fetch-links";

export async function ActionStack() {
  const [links, userId] = await Promise.all([fetchLinks(), getAuthUserId()]);

  return (
    <RealtimeLinksProvider initialLinks={links} userId={userId}>
      <Suspense fallback={<ActionCardSkeleton />}>
        <ActionStackList />
      </Suspense>
    </RealtimeLinksProvider>
  );
}
