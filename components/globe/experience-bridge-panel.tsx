"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { listReadableBridgeParticipants } from "@/lib/experience-bridge";
import {
  fetchPeerThreadMembers,
  type PeerThreadMemberPublic,
} from "@/lib/peer-chat/peer-chat-client";
import { useExperienceBridge } from "@/hooks/use-experience-bridge";
import { useAuth } from "@/hooks/use-auth";
import { projectContextMediaReel } from "@/lib/globe/project-context-media-reel";
import { ExperienceBridgePreviewCollage } from "@/components/globe/experience-bridge-preview-collage";
import { ExperienceBridgeParticipantsStrip } from "@/components/globe/experience-bridge-participants-strip";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type ExperienceBridgePanelProps = {
  event: EventCandidate;
  peerThreadId?: string | null;
  className?: string;
};

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "초대됨";
    case "accepted":
      return "함께 보는 중";
    case "declined":
      return "거절";
    case "left":
      return "나감";
    case "removed":
      return "제외됨";
    default:
      return status;
  }
}

/** Shared experience — invite · accept · merged participants (v1). */
export function ExperienceBridgePanel({
  event,
  peerThreadId,
  className,
}: ExperienceBridgePanelProps) {
  const { user, configured } = useAuth();
  const bridge = useExperienceBridge({ event, peerThreadId, enabled: configured });
  const [members, setMembers] = useState<PeerThreadMemberPublic[]>([]);
  const [busy, setBusy] = useState(false);

  const threadId = peerThreadId?.trim() || bridge.state?.bridge.peerThreadId?.trim() || "";

  useEffect(() => {
    if (!threadId || !configured) {
      return;
    }
    void fetchPeerThreadMembers(threadId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [threadId, configured]);

  const reelItems = useMemo(
    () => projectContextMediaReel({ event, volume: null, viewerUserId: user?.id }),
    [event, user?.id, bridge.state],
  );

  const previewMedia = useMemo(
    () =>
      reelItems
        .filter((row) => row.imageUrl?.trim())
        .slice(0, 3)
        .map((row) => ({
          url: row.imageUrl!.trim(),
          kind: row.kind,
          authorDisplayName: row.authorDisplayName,
          authorAvatarUrl: row.authorAvatarUrl,
        })),
    [reelItems],
  );

  const myParticipant = bridge.state?.participants.find(
    (row) => row.userId === user?.id,
  );
  const canInvite = bridge.isHost;
  const pendingInvite = myParticipant?.status === "pending";
  const activeParticipants = useMemo(
    () => listReadableBridgeParticipants(bridge.state?.participants ?? []),
    [bridge.state?.participants],
  );

  const inviteCandidates = members.filter(
    (member) =>
      member.userId !== user?.id &&
      !bridge.state?.participants.some(
        (row) =>
          row.userId === member.userId &&
          row.status !== "declined" &&
          row.status !== "left",
      ),
  );

  const handleInvite = async (member: PeerThreadMemberPublic) => {
    const displayName =
      member.displayName?.trim() || member.rimvioId?.trim() || "친구";
    setBusy(true);
    try {
      await bridge.invite({
        userId: member.userId,
        displayName,
      });
      toast.success(`${displayName}님을 초대했어요`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "초대하지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    setBusy(true);
    try {
      await bridge.accept();
      toast.success(copy.globe.bridgeInviteAccepted);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : copy.globe.bridgeInviteAcceptFail);
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    try {
      await bridge.decline();
      toast.message(copy.globe.bridgeInviteDeclined);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : copy.globe.bridgeInviteDeclineFail);
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await bridge.leave();
      toast.message("공유 보기에서 나왔어요 · 내 추억은 그대로 남아요");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "나가지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return null;
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.25rem] border border-border/80 bg-card shadow-sm",
        className,
      )}
      data-experience-bridge
    >
      <ExperienceBridgePreviewCollage media={previewMedia} className="rounded-none ring-0" />

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {copy.globe.bridgeMediaEyebrow}
          </p>
          <p className="text-[14px] leading-snug text-foreground">
            같은 여행 · 각자 지도 · 한 타임라인. Rimvio 안에서만 함께 봐요.
          </p>
        </div>

        {reelItems.length > 0 ? (
          <ExperienceBridgeParticipantsStrip items={reelItems} />
        ) : null}

        {pendingInvite ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAccept()}
              className="flex-1 rounded-2xl bg-foreground px-4 py-3.5 text-[14px] font-semibold text-background shadow-sm disabled:opacity-60"
            >
              {copy.globe.bridgeInviteAcceptCta}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDecline()}
              className="rounded-2xl px-4 py-3.5 text-[14px] font-medium text-muted-foreground"
            >
              {copy.globe.bridgeInviteDeclineCta}
            </button>
          </div>
        ) : null}

        {activeParticipants.length > 0 ? (
          <ul className="space-y-1.5">
            {activeParticipants.map((row) => (
              <li
                key={row.userId}
                className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5 text-[13px]"
              >
                <span className="font-medium text-foreground">{row.displayName}</span>
                <span className="text-muted-foreground">{statusLabel(row.status)}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {canInvite && inviteCandidates.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-muted-foreground">초대하기</p>
            <div className="flex flex-wrap gap-2">
              {inviteCandidates.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  disabled={busy}
                  onClick={() => void handleInvite(member)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground shadow-sm disabled:opacity-60"
                >
                  + {member.displayName}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {canInvite && !bridge.state && threadId ? (
          <button
            type="button"
            disabled={busy || bridge.loading}
            onClick={() => void bridge.bootstrap()}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-[14px] font-semibold text-foreground shadow-sm disabled:opacity-60"
          >
            함께하기 시작
          </button>
        ) : null}

        {myParticipant?.status === "accepted" && myParticipant.role !== "host" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleLeave()}
            className="text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            공유 보기에서 나가기
          </button>
        ) : null}

        {reelItems.length > 0 ? (
          <p className="text-center text-[11px] text-muted-foreground">
            {copy.globe.bridgeMediaSwipeHint(reelItems.length)}
          </p>
        ) : null}
      </div>
    </section>
  );
}
