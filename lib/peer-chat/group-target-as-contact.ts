import type { PeerContact } from "@/lib/context/peer-contact-types";
import type { GroupTalkTarget } from "@/lib/peer-chat/group-talk-target-types";

/** Reuse @톡 feed peer talk session with a group ROOM id. */
export function groupTargetAsPeerContact(target: GroupTalkTarget): PeerContact {
  const now = new Date().toISOString();
  return {
    peerThreadId: target.peerThreadId,
    displayName: target.displayName,
    createdAt: now,
    updatedAt: now,
  };
}
