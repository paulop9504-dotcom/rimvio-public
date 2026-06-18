import type { PeerContact } from "@/lib/context/peer-contact-types";
import { getTalkProfileCache } from "@/lib/peer-chat/peer-talk-profile-cache";

/** @톡 실시간 검색 — 프로필 이름 · ROOM 이름 · Rimvio ID · 이메일 */
export function talkContactSearchHaystack(contact: PeerContact): string {
  const cached = getTalkProfileCache(contact.peerThreadId);
  const email = (
    contact.emailLower ??
    cached?.emailLower ??
    ""
  )
    .trim()
    .toLowerCase();
  const emailLocal = email.includes("@") ? email.split("@")[0]! : email;

  return [
    contact.displayName,
    contact.profileDisplayName ?? "",
    contact.roomDisplayName ?? "",
    cached?.displayName ?? "",
    contact.rimvioId ?? cached?.rimvioId ?? "",
    email,
    emailLocal,
  ]
    .join(" ")
    .trim()
    .toLowerCase();
}

export function contactMatchesTalkQuery(
  contact: PeerContact,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return talkContactSearchHaystack(contact).includes(q);
}
