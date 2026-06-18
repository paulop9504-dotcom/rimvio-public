import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  bootstrapExperienceBridgeRemote,
  inviteExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import { hydrateBridgeEventSnapshotForShare } from "@/lib/experience-bridge/hydrate-bridge-event-snapshot";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { publishBridgeEventCaptureContributions } from "@/lib/experience-bridge/publish-bridge-capture-contribution";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";
import { stampBridgeEventMetadata } from "@/lib/experience-bridge/stamp-bridge-event-metadata";

export type GlobeContextShareFriend = {
  userId: string;
  displayName: string;
  peerThreadId: string;
};

/** Host: bootstrap bridge + invite selected friends. */
export async function shareGlobeContextWithFriends(input: {
  event: EventCandidate;
  hostDisplayName: string;
  friends: readonly GlobeContextShareFriend[];
}): Promise<{ invited: number }> {
  const friends = input.friends.filter(
    (row) => row.userId.trim() && row.displayName.trim(),
  );
  if (friends.length === 0) {
    return { invited: 0 };
  }

  const primaryThreadId = friends[0]!.peerThreadId.trim();
  const shareEvent = await hydrateBridgeEventSnapshotForShare(input.event);
  const bootstrap = await bootstrapExperienceBridgeRemote({
    event: shareEvent,
    peerThreadId: primaryThreadId,
    hostDisplayName: input.hostDisplayName,
  });
  writeLocalBridgeState(bootstrap.state);
  stampBridgeEventMetadata({
    event: shareEvent,
    bridge: bootstrap.state.bridge,
    role: "host",
  });

  await publishBridgeEventCaptureContributions({
    event: shareEvent,
    authorDisplayName: input.hostDisplayName,
  });

  let invited = 0;
  for (const friend of friends) {
    const result = await inviteExperienceBridgeRemote({
      eventId: input.event.id,
      event: shareEvent,
      peerThreadId: friend.peerThreadId,
      hostDisplayName: input.hostDisplayName,
      participantUserId: friend.userId,
      participantDisplayName: friend.displayName,
    });
    writeLocalBridgeState(result.state);
    invited += 1;
  }

  notifyBridgeSharedMediaUpdated();
  return { invited };
}
