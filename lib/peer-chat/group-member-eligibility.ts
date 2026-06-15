import type { PeerContact } from "@/lib/context/peer-contact-types";
import {
  extractOtherUserIdFromDmThread,
  isDmThreadId,
} from "@/lib/peer-chat/dm-thread";

/** 친구 연락처 중 단톡에 아직 없는 1:1 DM만 (멤버 추가 UI). */
export function filterContactsForGroupAdd(input: {
  contacts: readonly PeerContact[];
  memberUserIds: ReadonlySet<string>;
  callerUserId: string;
}): PeerContact[] {
  return input.contacts.filter((contact) => {
    if (!isDmThreadId(contact.peerThreadId)) {
      return false;
    }
    const otherUserId = extractOtherUserIdFromDmThread(
      contact.peerThreadId,
      input.callerUserId,
    );
    if (!otherUserId) {
      return false;
    }
    return !input.memberUserIds.has(otherUserId);
  });
}
