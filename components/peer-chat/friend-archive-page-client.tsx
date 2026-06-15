"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { FriendArchiveChatList } from "@/components/peer-chat/friend-archive-chat-list";
import { FriendAddSheet } from "@/components/peer-chat/friend-add-sheet";
import { IOS } from "@/lib/ui/ios-surface";
import {
  fetchRelationshipFeedSlots,
  fetchSocialLayer,
  syncMyProfileFromAuth,
} from "@/lib/peer-chat/peer-chat-client";
import { buildArchiveChatRows } from "@/lib/social/archive-chat-rows";
import type { RelationshipFeedSlot } from "@/lib/social/relationship-slot-types";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import {
  applySocialLayerToLocalRoster,
  listArchivePeers,
} from "@/lib/social/sync-social-layer";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

export function FriendArchivePageClient() {
  const router = useRouter();
  const { user, configured } = useAuth();
  const usePhoneChat = Boolean(configured && user && isSupabaseConfigured());
  const [pinnedPeers, setPinnedPeers] = useState<SocialBubblePeer[]>([]);
  const [archivePeers, setArchivePeers] = useState<SocialBubblePeer[]>([]);
  const [feedSlots, setFeedSlots] = useState<RelationshipFeedSlot[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const archiveList = useMemo(
    () => listArchivePeers(pinnedPeers, archivePeers),
    [pinnedPeers, archivePeers],
  );

  const archiveChatRows = useMemo(
    () => buildArchiveChatRows(archiveList, feedSlots),
    [archiveList, feedSlots],
  );

  const load = useCallback(async () => {
    if (!usePhoneChat) {
      return;
    }
    const [layer, feed] = await Promise.all([
      fetchSocialLayer(),
      fetchRelationshipFeedSlots().catch(() => ({ slots: [] as RelationshipFeedSlot[] })),
    ]);
    setPinnedPeers(layer.pinned);
    setArchivePeers(layer.archive);
    setFeedSlots(feed.slots);
    applySocialLayerToLocalRoster(layer);
  }, [usePhoneChat]);

  useEffect(() => {
    if (!usePhoneChat) {
      return;
    }
    void syncMyProfileFromAuth().catch(() => {});
    void load().catch(() => {});
    const timer = window.setInterval(() => void load().catch(() => {}), 12_000);
    return () => window.clearInterval(timer);
  }, [usePhoneChat, load]);

  const empty = archiveList.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-8">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <Link
          href="/peers"
          className="flex size-9 items-center justify-center rounded-full active:bg-rimvio-surface-muted"
          aria-label="관계 버블로"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-white">구슬 주머니</h1>
          {!empty ? (
            <p className="text-[11px] text-muted-foreground">
              친구 {archiveList.length}명 · 톡 오면 맨 위
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex size-9 items-center justify-center rounded-full text-rimvio-neon-cyan active:bg-rimvio-surface-muted"
          aria-label="친구 추가"
        >
          <UserPlus className="size-5" aria-hidden />
        </button>
      </header>

      <FriendArchiveChatList rows={archiveChatRows} className="min-h-0 flex-1" />

      {empty ? (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className={cn(
            "mx-4 mb-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-rimvio-surface py-3 text-sm font-medium text-white active:scale-[0.98]",
            IOS.cardSm,
          )}
        >
          <UserPlus className="size-4 text-rimvio-neon-cyan" aria-hidden />
          친구 추가
        </button>
      ) : null}

      <FriendAddSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={async (result) => {
          addPeerContact({
            peerThreadId: result.threadId,
            displayName: result.displayName,
            rimvioId: result.rimvioId,
            emailLower: result.emailLower,
          });
          await load();
          toast.success(`${result.displayName}를 친구로 추가했어요`);
          router.push(`/peers/${encodeURIComponent(result.threadId)}`);
        }}
        onContactSynced={() => void load()}
      />
    </div>
  );
}
