import { AppShell } from "@/components/app-shell";
import { PeerThreadRoomClient } from "@/components/peer-chat/peer-thread-room-client";

type PageProps = {
  params: Promise<{ peerThreadId: string }>;
};

export default async function PeerThreadPage({ params }: PageProps) {
  const { peerThreadId } = await params;
  const decoded = decodeURIComponent(peerThreadId);

  return (
    <AppShell
      title="대화"
      compact
      iosSurface
      hideTitle
      hideBranding
      fullBleed
      hideBottomNav
    >
      <PeerThreadRoomClient peerThreadId={decoded} />
    </AppShell>
  );
}
