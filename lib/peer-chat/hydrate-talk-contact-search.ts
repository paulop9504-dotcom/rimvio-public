import { addPeerContact } from "@/lib/context/peer-contact-store";
import {
  fetchDmPeerPublicProfile,
  isRegisteredPeerDmThread,
} from "@/lib/peer-chat/peer-chat-client";
import { listPeersForTalk } from "@/lib/peer-chat/list-peers-for-talk";
import { setTalkProfileCache } from "@/lib/peer-chat/peer-talk-profile-cache";

let hydratePromise: Promise<void> | null = null;

/** @톡 — 서버 프로필(이름·ID·이메일)을 검색용으로 동기화 */
export async function hydrateTalkContactSearch(): Promise<void> {
  if (hydratePromise) {
    return hydratePromise;
  }

  hydratePromise = (async () => {
    const targets = listPeersForTalk().filter((c) =>
      isRegisteredPeerDmThread(c.peerThreadId),
    );

    await Promise.all(
      targets.map(async (contact) => {
        try {
          const profile = await fetchDmPeerPublicProfile(contact.peerThreadId);
          if (!profile) {
            return;
          }
          const profileName = profile.displayName?.trim() || null;
          const rimvioId = profile.rimvioId ?? null;
          const emailLower = profile.emailLower ?? null;

          setTalkProfileCache(contact.peerThreadId, {
            displayName: profileName,
            rimvioId,
            emailLower,
          });

          addPeerContact({
            peerThreadId: contact.peerThreadId,
            displayName: profileName || contact.displayName,
            profileDisplayName: profileName,
            roomDisplayName: contact.roomDisplayName,
            rimvioId,
            emailLower,
          });
        } catch {
          /* ignore per-contact */
        }
      }),
    );
  })().finally(() => {
    hydratePromise = null;
  });

  return hydratePromise;
}
