import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import {
  appendFeedPeerTalkMessage,
  buildFeedPeerTalkPromptLine,
  migrateFeedPeerTalkThreadId,
  patchFeedPeerTalkThread,
  removeFeedPeerTalkMessageById,
  replaceFeedPeerTalkPendingMessage,
  replaceLastPeerTalkChipWithThread,
  sliceFeedPeerTalkHistory,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-message-state";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import { toast } from "sonner";
import { clearFeedPeerTalkSession } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-session";
import type { FeedPeerTalkThreadWire } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";
import {
  buildSwitchFeedPeerTalkToast,
  wipeFeedPeerTalkSurfaceIfNeeded,
} from "@/lib/action-chat/feed-peer-talk/end-feed-peer-talk";
import { emitFeedSlotsRefresh } from "@/lib/feed/feed-slots-events";
import { notifyFeedPeerTalkStarted } from "@/lib/peer-chat/navigate-peer-room-from-feed";
import {
  fetchPeerMessages,
  fetchSocialLayer,
  sendPeerMessageRemote,
  syncFeedSlotFromRoomRemote,
} from "@/lib/peer-chat/peer-chat-client";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import { setPeerThreadAiLens } from "@/lib/context/peer-thread-settings-store";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { resolveCanonicalPeerThreadFromSocialLayer } from "@/lib/peer-chat/resolve-canonical-peer-thread";
import {
  getFeedPeerTalkSession,
  setFeedPeerTalkSession,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-session";
import { resolveFeedPeerTalkSessionFromMessages } from "@/lib/action-chat/feed-peer-talk/restore-feed-peer-talk-session";
import { prefetchPeerMessages, takePrefetchedMessages } from "@/lib/peer-chat/message-prefetch-cache";
import { ingestPeerTalkMarble } from "@/lib/inside-out/marble-ingest";

type FeedPeerTalkDeps = {
  readMessages: () => ActionChatMessage[];
  persist: (next: ActionChatMessage[]) => void;
};

async function resolveFeedPeerTalkThreadId(input: {
  peerThreadId: string;
  displayName: string;
}): Promise<string> {
  if (isGroupThreadId(input.peerThreadId)) {
    return input.peerThreadId;
  }
  try {
    const layer = await fetchSocialLayer();
    const canonical = resolveCanonicalPeerThreadFromSocialLayer(
      {
        peerThreadId: input.peerThreadId,
        displayName: input.displayName,
        rimvioId: null,
      },
      layer,
    );
    if (canonical !== input.peerThreadId) {
      setFeedPeerTalkSession({
        peerThreadId: canonical,
        displayName: input.displayName,
      });
    }
    return canonical;
  } catch {
    return input.peerThreadId;
  }
}

async function loadPeerHistory(threadId: string): Promise<{
  messages: ReturnType<typeof sliceFeedPeerTalkHistory>;
  peerLastReadAt: string | null;
}> {
  const prefetched = takePrefetchedMessages(threadId);
  if (prefetched) {
    return {
      messages: sliceFeedPeerTalkHistory(prefetched),
      peerLastReadAt: null,
    };
  }
  const remote = await fetchPeerMessages(threadId);
  return {
    messages: sliceFeedPeerTalkHistory(remote.messages),
    peerLastReadAt: remote.peerLastReadAt,
  };
}

export async function startFeedPeerTalkInFeed(
  deps: FeedPeerTalkDeps,
  contact: PeerContact,
): Promise<void> {
  const displayName = contact.displayName.trim() || "친구";
  const peerThreadId = await resolveFeedPeerTalkThreadId({
    peerThreadId: contact.peerThreadId,
    displayName,
  });

  const { previousDisplayName } = wipeFeedPeerTalkSurfaceIfNeeded(
    deps,
    peerThreadId,
  );
  if (previousDisplayName) {
    toast.message(buildSwitchFeedPeerTalkToast(previousDisplayName, displayName));
  }

  setFeedPeerTalkSession({ peerThreadId, displayName });
  setPeerThreadAiLens({ peerThreadId, displayName, enabled: true });
  if (peerThreadId !== contact.peerThreadId) {
    addPeerContact({
      displayName,
      peerThreadId,
      rimvioId: contact.rimvioId ?? null,
      emailLower: contact.emailLower ?? null,
    });
  }
  prefetchPeerMessages(peerThreadId);

  const hydratingWire: FeedPeerTalkThreadWire = {
    peerThreadId,
    displayName,
    messages: [],
    historyEndIndex: -1,
    promptLine: buildFeedPeerTalkPromptLine(displayName, peerThreadId),
    hydrating: true,
  };

  const { messages: withShell, threadMessageId } = replaceLastPeerTalkChipWithThread(
    deps.readMessages(),
    hydratingWire,
  );
  deps.persist(withShell);

  try {
    const history = await loadPeerHistory(peerThreadId);
    const wire: FeedPeerTalkThreadWire = {
      peerThreadId,
      displayName,
      messages: history.messages,
      historyEndIndex: Math.max(0, history.messages.length - 1),
      promptLine: buildFeedPeerTalkPromptLine(displayName, peerThreadId),
      peerLastReadAt: history.peerLastReadAt,
      hydrating: false,
    };
    deps.persist(
      patchFeedPeerTalkThread(deps.readMessages(), threadMessageId, wire),
    );
    notifyFeedPeerTalkStarted(displayName);
  } catch {
    deps.persist(
      patchFeedPeerTalkThread(deps.readMessages(), threadMessageId, {
        hydrating: false,
        messages: [],
        historyEndIndex: -1,
      }),
    );
  }
}

export async function sendFeedPeerTalkInFeed(
  deps: FeedPeerTalkDeps,
  text: string,
  options?: { quietOnError?: boolean },
): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  const session =
    getFeedPeerTalkSession() ??
    resolveFeedPeerTalkSessionFromMessages(deps.readMessages());
  if (!session) {
    if (!options?.quietOnError) {
      toast.error("톡 대화가 열려 있지 않아요. @톡으로 친구를 선택해 주세요.");
    }
    return false;
  }
  if (!getFeedPeerTalkSession()) {
    setFeedPeerTalkSession(session);
  }

  const threadId = await resolveFeedPeerTalkThreadId({
    peerThreadId: session.peerThreadId,
    displayName: session.displayName,
  });

  if (threadId !== session.peerThreadId) {
    setFeedPeerTalkSession({
      peerThreadId: threadId,
      displayName: session.displayName,
    });
    deps.persist(
      migrateFeedPeerTalkThreadId(
        deps.readMessages(),
        session.peerThreadId,
        threadId,
      ),
    );
  }

  const pendingId = `pending-${Date.now()}`;
  const optimistic: PeerMessage = {
    id: pendingId,
    peerThreadId: threadId,
    author: "me",
    body: trimmed,
    sentAt: new Date().toISOString(),
    messageType: "human",
  };

  deps.persist(
    appendFeedPeerTalkMessage(
      deps.readMessages(),
      threadId,
      optimistic,
    ),
  );

  try {
    const sent = await sendPeerMessageRemote({
      threadId,
      displayName: session.displayName,
      body: trimmed,
    });

    deps.persist(
      replaceFeedPeerTalkPendingMessage(
        deps.readMessages(),
        threadId,
        pendingId,
        sent,
      ),
    );

    const marble = ingestPeerTalkMarble({
      body: trimmed,
      peerThreadId: threadId,
      messageId: sent.id,
      displayName: session.displayName,
    });
    if (marble && typeof console !== "undefined") {
      console.debug("[Rimvio IO] MARBLE_INGEST_PEER_TALK", {
        eventId: marble.id,
        title: marble.title,
        category: marble.category,
      });
    }

    void syncFeedSlotFromRoomRemote(threadId)
      .then(() => emitFeedSlotsRefresh())
      .catch(() => emitFeedSlotsRefresh());

    return true;
  } catch (error) {
    deps.persist(
      removeFeedPeerTalkMessageById(
        deps.readMessages(),
        threadId,
        pendingId,
      ),
    );
    const message =
      error instanceof Error ? error.message : "메시지를 보내지 못했어요";
    if (!options?.quietOnError) {
      toast.error(message);
    }
    return false;
  }
}

export function resetFeedPeerTalkSession(): void {
  clearFeedPeerTalkSession();
}
