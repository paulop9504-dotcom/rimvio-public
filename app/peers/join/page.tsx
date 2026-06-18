import { AppShell } from "@/components/app-shell";
import { PeerJoinClient } from "@/components/peer-chat/peer-join-client";

export default function PeerJoinPage() {
  return (
    <AppShell title="초대 참여" compact iosSurface>
      <PeerJoinClient />
    </AppShell>
  );
}
