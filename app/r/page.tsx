import { AppShell } from "@/components/app-shell";
import { RoomsHubClient } from "@/components/rooms-hub-client";

import { copy } from "@/lib/copy/human-ko";

export default function RoomsHubPage() {
  return (
    <AppShell title={copy.room.hubTitle} subtitle={copy.room.hubSubtitle} compact iosSurface>
      <RoomsHubClient />
    </AppShell>
  );
}
