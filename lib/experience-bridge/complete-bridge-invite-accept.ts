"use client";

import { ensureBridgeParticipantPin } from "@/lib/experience-bridge/build-participant-pin";
import type { ExperienceBridgeState } from "@/lib/experience-bridge/experience-bridge-types";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";
import { syncBridgeSharedMediaFromRemote } from "@/lib/experience-bridge/sync-bridge-participant-media";

/** After remote accept — pin, local state, pull host/friend shared media. */
export async function completeBridgeInviteAccept(input: {
  state: ExperienceBridgeState;
  peerThreadId?: string | null;
  viewerUserId?: string | null;
}): Promise<string> {
  const eventId = input.state.bridge.eventId.trim();
  if (!eventId) {
    throw new Error("bridge_event_missing");
  }

  ensureBridgeParticipantPin({
    bridge: input.state.bridge,
    peerThreadId: input.peerThreadId,
  });
  writeLocalBridgeState(input.state);
  await syncBridgeSharedMediaFromRemote(eventId, input.viewerUserId);
  notifyBridgeSharedMediaUpdated();
  return eventId;
}
