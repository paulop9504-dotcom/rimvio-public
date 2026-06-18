import { ActionFeedList } from "@/components/action-feed-list";
import { RealtimeLinksProvider } from "@/hooks/use-realtime-links";
import { getAuthUserId } from "@/lib/auth/session";
import { fetchLinks } from "@/lib/data/fetch-links";

export async function ActionFeed() {
  const [links, userId] = await Promise.all([fetchLinks(), getAuthUserId()]);

  return (
    <RealtimeLinksProvider initialLinks={links} userId={userId}>
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <ActionFeedList />
      </div>
    </RealtimeLinksProvider>
  );
}
