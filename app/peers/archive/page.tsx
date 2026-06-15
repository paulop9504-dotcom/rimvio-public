import { AppShell } from "@/components/app-shell";
import { FriendArchivePageClient } from "@/components/peer-chat/friend-archive-page-client";

export default function FriendArchivePage() {
  return (
    <AppShell title="구슬 주머니" compact iosSurface hideTitle>
      <FriendArchivePageClient />
    </AppShell>
  );
}
