import { AppShell } from "@/components/app-shell";
import { RoomFeedClient } from "@/components/room-feed-client";

type RoomPageProps = {
  params: Promise<{ slug: string }>;
};

import { copy } from "@/lib/copy/human-ko";

export default async function RoomPage({ params }: RoomPageProps) {
  const { slug } = await params;

  return (
    <AppShell title={copy.room.hubTitle} hideTitle compact iosSurface>
      <RoomFeedClient slug={slug} />
    </AppShell>
  );
}
