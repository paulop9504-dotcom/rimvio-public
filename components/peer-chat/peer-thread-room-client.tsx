"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ExperienceDiscussionHeader } from "@/components/experience/experience-discussion-header";
import { buildExperienceRoomBackHref } from "@/lib/globe/resolve-experience-peer-thread-id";
import { toast } from "sonner";
import { useLongPress } from "@/lib/hooks/use-long-press";
import { useCopy } from "@/hooks/use-copy";
import { usePeerThreadSettings } from "@/hooks/use-peer-thread-settings";
import {
  markLensFirstCoachShown,
  shouldShowLensFirstCoach,
} from "@/lib/onboarding/lens-first-coach";
import { PeerPublicProfileSheet } from "@/components/peer-chat/peer-public-profile-sheet";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import {
  fetchPeerThreadMeta,
  isRegisteredPeerDmThread,
  markPeerThreadReadRemote,
  syncFeedSlotFromRoomRemote,
} from "@/lib/peer-chat/peer-chat-client";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { emitFeedSlotsRefresh } from "@/lib/feed/feed-slots-events";
import { UNPIN_PEER_RETENTION_DAYS } from "@/lib/context/hub-room-retention";
import {
  addPeerContact,
  getPeerContactById,
} from "@/lib/context/peer-contact-store";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { purgePendingLabel } from "@/lib/context/pinned-peer-roster";
import { findSlotByPeerId } from "@/lib/context/pinned-peer-roster";
import { readPinnedRoster } from "@/lib/context/peer-thread-settings-store";
import { cn } from "@/lib/utils";
import { AiLensToggle } from "@/components/peer-chat/ai-lens-toggle";
import { PeerChatThreadShell } from "@/components/peer-chat/peer-chat-thread-shell";
import { PeerThreadChatPanel } from "@/components/peer-chat/peer-thread-chat-panel";
import { GroupInfoSheet } from "@/components/peer-chat/group-info-sheet";
import { PeerThreadHubPinBar } from "@/components/peer-chat/peer-thread-hub-pin-bar";

type PeerThreadRoomClientProps = {
  peerThreadId: string;
};

function PeerThreadRoomBody({ peerThreadId }: PeerThreadRoomClientProps) {
  const copy = useCopy();
  const searchParams = useSearchParams();
  const experienceEventId = searchParams.get("experience")?.trim() || null;
  const experienceTitle = searchParams.get("experienceTitle")?.trim() || null;
  const experienceDate = searchParams.get("experienceDate")?.trim() || null;
  const experiencePlace = searchParams.get("experiencePlace")?.trim() || null;
  const experienceDiscussion = Boolean(experienceTitle);
  const experienceBackHref = buildExperienceRoomBackHref(experienceEventId);
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [groupMetaName, setGroupMetaName] = useState<string | null>(null);
  const [groupInviteCode, setGroupInviteCode] = useState<string | null>(null);
  const roster = useMemo(() => readPinnedRoster(), []);
  const [contact, setContact] = useState<PeerContact | null>(() =>
    getPeerContactById(peerThreadId),
  );
  const refreshContact = useCallback(() => {
    setContact(getPeerContactById(peerThreadId));
  }, [peerThreadId]);
  const hubSlot = findSlotByPeerId(roster, peerThreadId);
  const isGroup = isGroupThreadId(peerThreadId);
  const phoneDm = isRegisteredPeerDmThread(peerThreadId);

  useEffect(() => {
    refreshContact();
  }, [refreshContact]);

  useEffect(() => {
    if (contact || !phoneDm || isGroup) {
      return;
    }
    void fetchPeerThreadMeta(peerThreadId)
      .then((meta) => {
        const added = addPeerContact({
          peerThreadId,
          displayName: meta.displayName?.trim() || "친구",
        });
        if (added.ok) {
          setContact(added.contact);
        }
      })
      .catch(() => {});
  }, [contact, phoneDm, isGroup, peerThreadId]);
  const { profile, loading: profileLoading, reload: reloadProfile } =
    useDmPeerProfile(peerThreadId, phoneDm && !isGroup);

  useEffect(() => {
    if (!isGroup) {
      return;
    }
    void fetchPeerThreadMeta(peerThreadId)
      .then((meta) => {
        setGroupMetaName(meta.displayName?.trim() || null);
        setGroupInviteCode(meta.inviteCode?.trim() || null);
      })
      .catch(() => {});
  }, [isGroup, peerThreadId]);

  useEffect(() => {
    if (isGroup) {
      void markPeerThreadReadRemote(peerThreadId).catch(() => {});
      return;
    }
    if (!phoneDm) {
      return;
    }
    void markPeerThreadReadRemote(peerThreadId)
      .then(() => reloadProfile())
      .catch(() => {});
    void syncFeedSlotFromRoomRemote(peerThreadId)
      .then(() => emitFeedSlotsRefresh())
      .catch(() => {});
  }, [phoneDm, isGroup, peerThreadId, reloadProfile]);

  const displayName = isGroup
    ? groupMetaName || "단톡"
    : profile?.displayName?.trim() ||
      contact?.displayName ||
      hubSlot?.displayName ||
      "친구";

  const { settings, setAiLens } = usePeerThreadSettings({
    peerThreadId,
    displayName,
  });

  const policyInput = useMemo(
    () => ({
      settings,
      roster,
    }),
    [settings, roster],
  );

  const toggleAiLens = (next: boolean) => {
    setAiLens(next);
    if (next && shouldShowLensFirstCoach()) {
      markLensFirstCoachShown();
      toast.success(copy.product.lensCoachOn, {
        description: copy.product.lensCoachSub,
        duration: 5500,
      });
    }
  };

  const headerLongPress = useLongPress({
    onLongPress: () => toggleAiLens(!settings.aiLensEnabled),
    onTap: phoneDm
      ? () => setProfileOpen(true)
      : isGroup
        ? () => setGroupInfoOpen(true)
        : undefined,
  });

  if (!isGroup && !phoneDm && !contact && !hubSlot) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          이 친구는 목록에 없어요. ROOM 허브에서 친구를 추가해 주세요
        </p>
        <Link href="/peers" className="text-sm font-semibold text-rimvio-neon-cyan">
          ROOM 으로
        </Link>
      </div>
    );
  }

  const purgeLabel = hubSlot ? purgePendingLabel(hubSlot) : null;
  const connected = hubSlot?.connection === "connected";
  const pinned = connected;
  const unpinnedContact = Boolean(contact) && !pinned;
  const showHubNotices = !phoneDm && !isGroup;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="flex h-11 shrink-0 items-center border-b border-border bg-card px-0.5 pb-0 pt-[env(safe-area-inset-top,0px)]">
        <Link
          href={experienceDiscussion ? experienceBackHref : "/peers"}
          className="flex size-10 items-center justify-center text-foreground"
          aria-label={experienceDiscussion ? "경험으로" : "뒤로"}
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        {experienceDiscussion && experienceTitle ? (
          <ExperienceDiscussionHeader
            title={experienceTitle}
            date={experienceDate}
            place={experiencePlace}
          />
        ) : phoneDm ? (
          <button
            type="button"
            {...headerLongPress}
            className={cn(
              "relative min-w-0 flex-1 truncate py-1 text-left text-[16px] font-medium text-foreground",
              settings.aiLensEnabled &&
                "after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:bg-cyan-400/50 after:blur-[2px]",
            )}
            aria-label={
              settings.aiLensEnabled
                ? `${displayName} · AI 렌즈 켜짐 (길게 눌러 끄기)`
                : `${displayName} · 길게 눌러 AI 렌즈`
            }
          >
            {displayName}
            {settings.aiLensEnabled ? (
              <span className="ml-1.5 inline-block size-1.5 translate-y-[-1px] rounded-full bg-cyan-400/80 align-middle" />
            ) : null}
          </button>
        ) : (
          <button
            type="button"
            {...headerLongPress}
            className={cn(
              "relative min-w-0 flex-1 truncate py-1 text-left text-[16px] font-medium text-foreground",
              settings.aiLensEnabled &&
                "after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:bg-cyan-400/50 after:blur-[2px]",
            )}
            aria-label={
              settings.aiLensEnabled
                ? `${displayName} · 단톡 정보 (탭) · AI 렌즈 켜짐`
                : `${displayName} · 단톡 정보 (탭) · 길게 눌러 AI 렌즈`
            }
          >
            {displayName}
            {settings.aiLensEnabled ? (
              <span className="ml-1.5 inline-block size-1.5 translate-y-[-1px] rounded-full bg-cyan-400/80 align-middle" />
            ) : null}
          </button>
        )}
        {experienceDiscussion ? null : (
          <>
            <AiLensToggle
              enabled={settings.aiLensEnabled}
              onChange={toggleAiLens}
              size="sm"
              className="mr-1"
            />
            <PeerThreadHubPinBar
              peerThreadId={peerThreadId}
              displayName={displayName}
              friendUserId={phoneDm && !isGroup ? profile?.userId : null}
              roomKind={isGroup ? "group" : "dm"}
              variant="header"
            />
          </>
        )}
      </header>

      <PeerPublicProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        fallbackName={displayName}
        loading={profileLoading}
        peerThreadId={peerThreadId}
      />

      {isGroup ? (
        <GroupInfoSheet
          open={groupInfoOpen}
          onOpenChange={setGroupInfoOpen}
          threadId={peerThreadId}
          displayName={displayName}
          inviteCode={groupInviteCode}
          onRenamed={(nextName) => {
            setGroupMetaName(nextName);
          }}
        />
      ) : null}

      {experienceDiscussion ? null : showHubNotices && hubSlot?.connection === "purge_pending" ? (
        <p className="bg-amber-950/40 px-3 py-2 text-[11px] text-amber-200">
          AI 허브가 해제되어 {purgeLabel ?? `${UNPIN_PEER_RETENTION_DAYS}일 후`}{" "}
          대화가 삭제돼요
        </p>
      ) : null}

      {experienceDiscussion ? null : showHubNotices && unpinnedContact ? (
        <p className="px-3 py-1.5 text-[11px] text-muted-foreground">
          AI 허브에 꽂인 친구만 @import 가능
        </p>
      ) : null}

      {experienceDiscussion ? null : isGroup && !pinned ? (
        <p className="px-3 py-1.5 text-[11px] text-muted-foreground">
          ROOM 1–5번에 고정하면 단톡 AI 렌즈·@import를 쓸 수 있어요
        </p>
      ) : null}

      <PeerChatThreadShell
        peerThreadId={peerThreadId}
        displayName={displayName}
        hideLensBar={phoneDm || isGroup}
      >
        <PeerThreadChatPanel
          displayName={displayName}
          policyInput={policyInput}
          aiLensEnabled={experienceDiscussion ? false : settings.aiLensEnabled}
          readOnly={!isGroup && hubSlot?.connection === "purge_pending"}
          showAiMentionLink={isGroup || pinned}
          peerAvatarUrl={isGroup ? null : profile?.avatarUrl}
          simpleDm={phoneDm && !isGroup}
          experienceDiscussion={experienceDiscussion}
        />
      </PeerChatThreadShell>
    </div>
  );
}

export function PeerThreadRoomClient({ peerThreadId }: PeerThreadRoomClientProps) {
  return (
    <Suspense fallback={null}>
      <PeerThreadRoomBody peerThreadId={peerThreadId} />
    </Suspense>
  );
}
