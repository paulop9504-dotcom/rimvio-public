"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { useAuth } from "@/hooks/use-auth";
import {
  appendPeerMessage,
  readPeerMessageLog,
  replacePeerMessageLog,
} from "@/lib/context/peer-message-log";
import type { PeerMessage, PeerMessageAuthor } from "@/lib/context/peer-message-types";
import { shouldPersistPeerMessageLog } from "@/lib/context/peer-thread-policy";
import type { PeerThreadPolicyInput } from "@/lib/context/peer-thread-types";
import {
  mapPeerMessageRow,
  mergePeerMessages,
  mergePeerMessagesBatch,
  sortPeerMessages,
} from "@/lib/peer-chat/message-mapper";
import {
  createOptimisticPeerMessage,
  mergeRealtimePeerMessage,
  removeOptimisticPeerMessage,
  replaceOptimisticPeerMessage,
} from "@/lib/peer-chat/optimistic-peer-message";
import { PEER_MESSAGE_IMAGE_PLACEHOLDER } from "@/lib/peer-chat/peer-chat-image-constants";
import {
  takePrefetchedMessages,
} from "@/lib/peer-chat/message-prefetch-cache";
import { parseOutgoingMessage } from "@/lib/chat-room/parse-ai-invoke";
import {
  buildPeerInviteUrl,
  ensurePeerThreadRemote,
  fetchPeerMessages,
  fetchPeerThreadMeta,
  fetchSocialLayer,
  invokePeerRoomAi,
  isRegisteredPeerDmThread,
  sendPeerImageRemote,
  sendPeerMessageRemote,
  syncFeedSlotFromRoomRemote,
} from "@/lib/peer-chat/peer-chat-client";
import { resolveCanonicalPeerThreadFromSocialLayer } from "@/lib/peer-chat/resolve-canonical-peer-thread";
import { emitFeedSlotsRefresh } from "@/lib/feed/feed-slots-events";
import type { PeerMessageRow } from "@/lib/peer-chat/types";
import { normalizePeerSyncError } from "@/lib/peer-chat/normalize-peer-sync-error";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { tryCreateClient } from "@/lib/supabase/client";
import { usePeerReadReceipt } from "@/hooks/use-peer-read-receipt";

const PEER_MESSAGES_TABLE = "peer_messages";
const PEER_MESSAGES_POLL_MS = 6_000;

function initialMessages(
  threadId: string,
  canPersist: boolean,
): PeerMessage[] {
  const prefetched = takePrefetchedMessages(threadId);
  if (prefetched?.length) {
    return sortPeerMessages(prefetched);
  }
  if (!canPersist) {
    return [];
  }
  return readPeerMessageLog(threadId).messages;
}

export function usePeerThreadChat(policy: PeerThreadPolicyInput) {
  const { user, configured } = useAuth();
  const supabase = useMemo(
    () => (configured ? tryCreateClient() : null),
    [configured],
  );
  const threadId = policy.settings.peerThreadId;
  const displayName = policy.settings.displayName;
  const canPersist = shouldPersistPeerMessageLog(policy);
  const useCloud = Boolean(configured && user && canPersist);

  const [messages, setMessages] = useState<PeerMessage[]>(() =>
    initialMessages(threadId, canPersist),
  );
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [cloudThreadId, setCloudThreadId] = useState<string | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [messagesHydrating, setMessagesHydrating] = useState(useCloud);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const hydrateGen = useRef(0);
  const {
    peerLastReadAt,
    setPeerLastReadAt,
    groupReadCursors,
    setGroupReadCursors,
    refreshPeerRead,
  } = usePeerReadReceipt(threadId, useCloud && cloudReady);

  const refreshLocal = useCallback(() => {
    if (!canPersist) {
      setMessages([]);
      return;
    }
    setMessages(readPeerMessageLog(threadId).messages);
  }, [canPersist, threadId]);

  useEffect(() => {
    setMessages(initialMessages(threadId, canPersist));
    setCloudThreadId(null);
    setCloudReady(false);
    setMessagesHydrating(useCloud);
    hydrateGen.current += 1;
  }, [threadId, canPersist, useCloud]);

  useEffect(() => {
    if (!useCloud) {
      setCloudThreadId(null);
      setCloudReady(false);
      setMessagesHydrating(false);
      setInviteCode(null);
      refreshLocal();
      return;
    }

    const generation = ++hydrateGen.current;
    let cancelled = false;

    void (async () => {
      try {
        setSyncError(null);
        setMessagesHydrating(true);

        const ensured = await ensurePeerThreadRemote({ threadId, displayName });
        if (cancelled || generation !== hydrateGen.current) {
          return;
        }

        setCloudThreadId(ensured.threadId);
        setInviteCode(ensured.inviteCode);

        const remotePayload = await fetchPeerMessages(threadId);
        const remote = remotePayload.messages;

        if (cancelled || generation !== hydrateGen.current) {
          return;
        }

        setPeerLastReadAt(remotePayload.peerLastReadAt);
        setGroupReadCursors(remotePayload.groupReadCursors ?? []);
        setMessages((current) => {
          const merged = mergePeerMessagesBatch(current, remote);
          if (canPersist && merged.length > 0) {
            replacePeerMessageLog(threadId, merged);
          }
          return merged;
        });
        setCloudReady(true);
      } catch (error) {
        if (!cancelled && generation === hydrateGen.current) {
          setSyncError(
            normalizePeerSyncError(
              error instanceof Error ? error.message : undefined,
            ),
          );
          refreshLocal();
        }
      } finally {
        if (!cancelled && generation === hydrateGen.current) {
          setMessagesHydrating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    useCloud,
    threadId,
    displayName,
    refreshLocal,
    canPersist,
    setPeerLastReadAt,
    setGroupReadCursors,
  ]);

  const realtimeThreadId = cloudThreadId ?? threadId;

  const pullRemoteMessages = useCallback(async () => {
    if (!useCloud) {
      return;
    }
    try {
      const remotePayload = await fetchPeerMessages(threadId);
      setPeerLastReadAt(remotePayload.peerLastReadAt);
      setMessages((current) => {
        const merged = mergePeerMessagesBatch(current, remotePayload.messages);
        if (canPersist && merged.length > 0) {
          replacePeerMessageLog(threadId, merged);
        }
        return merged;
      });
      setCloudReady(true);
      setSyncError(null);
    } catch {
      // Polling is best-effort when realtime drops or hydrate is slow.
    }
  }, [useCloud, threadId, canPersist, setPeerLastReadAt, setGroupReadCursors]);

  useEffect(() => {
    if (!useCloud) {
      return;
    }
    const timer = window.setInterval(() => {
      void pullRemoteMessages();
    }, PEER_MESSAGES_POLL_MS);
    return () => window.clearInterval(timer);
  }, [useCloud, pullRemoteMessages]);

  useEffect(() => {
    if (!useCloud || !supabase) {
      return;
    }

    let channel: RealtimeChannel;

    const subscribe = () => {
      channel = supabase
        .channel(`peer-messages:${realtimeThreadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: PEER_MESSAGES_TABLE,
            filter: `thread_id=eq.${realtimeThreadId}`,
          },
          (payload) => {
            const row = (payload as RealtimePostgresChangesPayload<PeerMessageRow>)
              .new as PeerMessageRow | undefined;
            if (!row?.id || !row.thread_id) {
              return;
            }
            const mapped = mapPeerMessageRow(row, user?.id);
            setMessages((current) => {
              const merged = mergeRealtimePeerMessage(current, mapped);
              if (canPersist) {
                replacePeerMessageLog(threadId, merged);
              }
              return merged;
            });
            if (
              isRegisteredPeerDmThread(realtimeThreadId) &&
              mapped.author !== "me"
            ) {
              void syncFeedSlotFromRoomRemote(realtimeThreadId)
                .then(() => emitFeedSlotsRefresh())
                .catch(() => emitFeedSlotsRefresh());
            }
          },
        )
        .subscribe();
    };

    subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [
    useCloud,
    supabase,
    realtimeThreadId,
    threadId,
    user?.id,
    canPersist,
  ]);

  const resolveSendThreadId = useCallback(async () => {
    if (isRegisteredPeerDmThread(threadId)) {
      return threadId;
    }
    try {
      const layer = await fetchSocialLayer();
      return resolveCanonicalPeerThreadFromSocialLayer(
        {
          peerThreadId: threadId,
          displayName,
          rimvioId: null,
        },
        layer,
      );
    } catch {
      return threadId;
    }
  }, [threadId, displayName]);

  const resolveActiveSendThreadId = useCallback(async () => {
    if (cloudThreadId) {
      return cloudThreadId;
    }
    return resolveSendThreadId();
  }, [cloudThreadId, resolveSendThreadId]);

  const sendHuman = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) {
        return null;
      }

      if (useCloud) {
        const sendThreadId = await resolveActiveSendThreadId();
        const pending = createOptimisticPeerMessage({
          peerThreadId: sendThreadId,
          body: trimmed,
        });
        setMessages((current) => {
          const merged = sortPeerMessages([...current, pending]);
          if (canPersist) {
            replacePeerMessageLog(threadId, merged);
          }
          return merged;
        });

        try {
          const message = await sendPeerMessageRemote({
            threadId: sendThreadId,
            displayName,
            body: trimmed,
          });
          setCloudThreadId((current) => current ?? sendThreadId);
          setCloudReady(true);
          setSyncError(null);
          setMessages((current) => {
            const merged = replaceOptimisticPeerMessage(
              current,
              pending.id,
              message,
            );
            if (canPersist) {
              replacePeerMessageLog(threadId, merged);
            }
            return merged;
          });
          if (isRegisteredPeerDmThread(sendThreadId)) {
            void syncFeedSlotFromRoomRemote(sendThreadId)
              .then(() => emitFeedSlotsRefresh())
              .catch(() => emitFeedSlotsRefresh());
          }
          return message;
        } catch (error) {
          setMessages((current) =>
            removeOptimisticPeerMessage(current, pending.id),
          );
          throw error;
        }
      }

      const message = appendPeerMessage({
        peerThreadId: threadId,
        author: "me",
        body: trimmed,
      });
      setMessages((current) => [...current, message]);
      return message;
    },
    [
      useCloud,
      threadId,
      displayName,
      canPersist,
      resolveActiveSendThreadId,
    ],
  );

  const invokeAi = useCallback(
    async (prompt: string) => {
      if (!useCloud) {
        return null;
      }
      setAiBusy(true);
      try {
        const sendThreadId = await resolveActiveSendThreadId();
        const message = await invokePeerRoomAi({
          threadId: sendThreadId,
          displayName,
          prompt,
        });
        setCloudThreadId((current) => current ?? sendThreadId);
        setCloudReady(true);
        setSyncError(null);
        setMessages((current) => {
          const merged = mergePeerMessages(current, message);
          if (canPersist) {
            replacePeerMessageLog(threadId, merged);
          }
          return merged;
        });
        return message;
      } finally {
        setAiBusy(false);
      }
    },
    [useCloud, threadId, displayName, canPersist, resolveActiveSendThreadId],
  );

  const sendImage = useCallback(
    async (file: File, caption?: string) => {
      if (!useCloud) {
        setSyncError("로그인 후 사진을 보낼 수 있어요");
        return null;
      }
      setImageBusy(true);
      const sendThreadId = await resolveActiveSendThreadId();
      const previewUrl = URL.createObjectURL(file);
      const pending = createOptimisticPeerMessage({
        peerThreadId: sendThreadId,
        body: caption?.trim() || PEER_MESSAGE_IMAGE_PLACEHOLDER,
        imageUrl: previewUrl,
      });
      setMessages((current) => {
        const merged = sortPeerMessages([...current, pending]);
        if (canPersist) {
          replacePeerMessageLog(threadId, merged);
        }
        return merged;
      });

      try {
        setSyncError(null);
        const { attachMediaSpacetime, serializeMediaSpacetimeForUpload } =
          await import("@/lib/location-ping/attach-media-spacetime");
        const spacetime = await attachMediaSpacetime({
          file,
          origin: "peer_chat",
          originRef: sendThreadId,
        });
        const message = await sendPeerImageRemote({
          threadId: sendThreadId,
          displayName,
          file,
          caption,
          spacetimeJson: serializeMediaSpacetimeForUpload(spacetime),
        });
        await import("@/lib/location-ping/media-context-store").then(({ saveMediaSpacetimeContext }) =>
          saveMediaSpacetimeContext({
            ...spacetime,
            originRef: message.id,
          }),
        );
        void import("@/lib/feed/ingest-peer-room-media-capture")
          .then(({ ingestPeerRoomMediaFromContext }) =>
            ingestPeerRoomMediaFromContext({
              context: spacetime,
              peerThreadId: sendThreadId,
            }),
          )
          .catch(() => {});
        setCloudThreadId((current) => current ?? sendThreadId);
        setCloudReady(true);
        setMessages((current) => {
          const merged = replaceOptimisticPeerMessage(
            current,
            pending.id,
            message,
          );
          if (canPersist) {
            replacePeerMessageLog(threadId, merged);
          }
          return merged;
        });
        if (isRegisteredPeerDmThread(sendThreadId)) {
          void syncFeedSlotFromRoomRemote(sendThreadId)
            .then(() => emitFeedSlotsRefresh())
            .catch(() => emitFeedSlotsRefresh());
        }
        return message;
      } catch (error) {
        setMessages((current) =>
          removeOptimisticPeerMessage(current, pending.id),
        );
        setSyncError(
          error instanceof Error ? error.message : "사진 전송에 실패했어요",
        );
        return null;
      } finally {
        URL.revokeObjectURL(previewUrl);
        setImageBusy(false);
      }
    },
    [useCloud, threadId, displayName, canPersist, resolveActiveSendThreadId],
  );

  const send = useCallback(
    async (body: string, author: PeerMessageAuthor = "me") => {
      const trimmed = body.trim();
      if (!trimmed || !canPersist || author !== "me") {
        return null;
      }

      const parsed = parseOutgoingMessage(trimmed);

      try {
        if (parsed.kind === "ai_invoke") {
          await sendHuman(parsed.body);
          return await invokeAi(parsed.prompt);
        }
        return await sendHuman(parsed.body);
      } catch (error) {
        setSyncError(
          error instanceof Error ? error.message : "메시지 전송에 실패했어요",
        );
        return null;
      }
    },
    [canPersist, sendHuman, invokeAi],
  );

  const inviteUrl = inviteCode ? buildPeerInviteUrl(inviteCode) : null;

  const refreshInvite = useCallback(async () => {
    if (!useCloud) {
      return null;
    }
    try {
      const meta = await fetchPeerThreadMeta(threadId);
      setInviteCode(meta.inviteCode);
      return meta.inviteCode;
    } catch {
      return null;
    }
  }, [useCloud, threadId]);

  return {
    messages,
    canSend: canPersist,
    send,
    sendImage,
    canSendImage: useCloud,
    refresh: refreshLocal,
    realtime: useCloud && (cloudReady || Boolean(cloudThreadId)),
    inviteCode,
    inviteUrl,
    syncError,
    refreshInvite,
    aiBusy,
    imageBusy,
    messagesHydrating,
    peerLastReadAt,
    groupReadCursors,
    refreshPeerRead,
  };
}
