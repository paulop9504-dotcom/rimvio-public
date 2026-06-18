import type { PeerContact } from "@/lib/context/peer-contact-types";
import { contactMatchesTalkQuery } from "@/lib/peer-chat/match-talk-contact-query";
import { listPeersForTalk } from "@/lib/peer-chat/list-peers-for-talk";

const MAX_RESULTS = 16;

/** @톡 친구 선택 — 연락처 + ROOM 고정, 프로필·ROOM 이름 모두 검색 */
export function filterPeerContactsForTalk(query: string): PeerContact[] {
  const contacts = listPeersForTalk();
  const q = query.trim().toLowerCase();
  if (!q) {
    return contacts.slice(0, MAX_RESULTS);
  }
  const filtered = contacts.filter((c) => contactMatchesTalkQuery(c, q));

  filtered.sort((a, b) => {
    const an = a.displayName.trim().toLowerCase();
    const bn = b.displayName.trim().toLowerCase();
    const aRim = a.rimvioId?.toLowerCase().startsWith(q) ? 0 : 1;
    const bRim = b.rimvioId?.toLowerCase().startsWith(q) ? 0 : 1;
    if (aRim !== bRim) {
      return aRim - bRim;
    }
    const aStarts = an.startsWith(q) ? 0 : 1;
    const bStarts = bn.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) {
      return aStarts - bStarts;
    }
    return an.localeCompare(bn, "ko");
  });

  return filtered.slice(0, MAX_RESULTS);
}
