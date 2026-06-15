"use client";

import { useCallback, useMemo, useState } from "react";
import { Pin } from "lucide-react";
import { toast } from "sonner";
import { usePeerThreadSettings } from "@/hooks/use-peer-thread-settings";
import { findSlotByPeerId, hubSlotAt } from "@/lib/context/pinned-peer-roster";
import type { RoomKind } from "@/lib/chat-room/types";
import {
  PINNED_PEER_SLOTS,
  type PinnedSlotIndex,
} from "@/lib/context/peer-thread-types";
import {
  pinFriendRemote,
  unpinFriendRemote,
} from "@/lib/peer-chat/peer-chat-client";
import { cn } from "@/lib/utils";

type PeerThreadHubPinBarProps = {
  peerThreadId: string;
  displayName: string;
  /** Rimvio 계정 DM이면 서버 friend_connections 고정 */
  friendUserId?: string | null;
  roomKind?: RoomKind;
  /** 헤더 오른쪽(이름 옆) vs 예전 전체 너비 바 */
  variant?: "header" | "bar";
};

export function PeerThreadHubPinBar({
  peerThreadId,
  displayName,
  friendUserId,
  roomKind = "dm",
  variant = "header",
}: PeerThreadHubPinBarProps) {
  const isGroup = roomKind === "group";
  const slotLabel = isGroup ? "단톡" : "친구";
  const { roster, setPinned, pinError } = usePeerThreadSettings({
    peerThreadId,
    displayName,
  });
  const [busy, setBusy] = useState(false);

  const hubSlot = useMemo(
    () => findSlotByPeerId(roster, peerThreadId),
    [roster, peerThreadId],
  );
  const connected = hubSlot?.connection === "connected";
  const slotIndex = connected ? hubSlot?.slotIndex : undefined;
  const inHeader = variant === "header";

  const syncServerPin = useCallback(
    async (friendId: string, slot: PinnedSlotIndex, pin: boolean) => {
      if (!friendId) {
        return;
      }
      if (pin) {
        await pinFriendRemote({ friendId, pinSlot: slot });
      } else {
        await unpinFriendRemote({ friendId });
      }
    },
    [],
  );

  const pinToSlot = useCallback(
    async (index: PinnedSlotIndex) => {
      const occupant = hubSlotAt(roster, index);
      if (
        occupant?.connection === "connected" &&
        occupant.peerThreadId &&
        occupant.peerThreadId !== peerThreadId
      ) {
        toast.error(`${index + 1}번은 다른 ROOM이 쓰고 있어요`);
        return;
      }
      setBusy(true);
      try {
        const result = setPinned(true, index);
        if (!result.ok) {
          if (result.reason === "roster_full") {
            toast.error("ROOM 고정 5슬롯이 가득 찼어요");
          }
          return;
        }
        if (friendUserId) {
          await syncServerPin(friendUserId, index, true);
        }
        toast.success(
          isGroup
            ? `${displayName} 단톡 · ${index + 1}번`
            : `${displayName} · ${index + 1}번에 고정했어요`,
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "고정에 실패했어요",
        );
      } finally {
        setBusy(false);
      }
    },
    [roster, peerThreadId, displayName, friendUserId, isGroup, setPinned, syncServerPin],
  );

  const unpin = useCallback(async () => {
    setBusy(true);
    try {
      setPinned(false);
      if (friendUserId) {
        await syncServerPin(friendUserId, slotIndex ?? 0, false);
      }
      toast.success("ROOM 고정을 해제했어요");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "고정 해제에 실패했어요",
      );
    } finally {
      setBusy(false);
    }
  }, [friendUserId, setPinned, slotIndex, syncServerPin]);

  const pinIcon = (
    <Pin
      className={cn(
        "shrink-0",
        inHeader ? "size-3.5" : "size-3.5",
        connected ? "text-[#FEE500]" : "text-white/40",
      )}
      aria-hidden
    />
  );

  const slotButtons = (
    <div className={cn("flex shrink-0", inHeader ? "gap-0.5" : "gap-1")}>
      {Array.from({ length: PINNED_PEER_SLOTS }, (_, i) => {
        const idx = i as PinnedSlotIndex;
        const slot = hubSlotAt(roster, idx);
        const taken =
          slot?.connection === "connected" &&
          slot.peerThreadId !== peerThreadId;
        return (
          <button
            key={idx}
            type="button"
            disabled={busy || taken}
            onClick={() => void pinToSlot(idx)}
            title={
              taken
                ? `${idx + 1}번 · 사용 중`
                : `${idx + 1}번에 ${slotLabel} 고정`
            }
            className={cn(
              "flex items-center justify-center rounded-full font-medium transition-colors",
              inHeader
                ? "size-6 text-[10px]"
                : "size-7 text-[11px]",
              taken
                ? "bg-white/10 text-white/25"
                : "bg-[#2c2c2e] text-white/80 active:bg-[#FEE500] active:text-[#191919]",
            )}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );

  if (inHeader) {
    return (
      <div
        className="flex max-w-[48%] shrink-0 items-center gap-1 pr-1"
        aria-label="ROOM 고정"
      >
        {connected && slotIndex !== undefined ? (
          <>
            {pinIcon}
            <span className="shrink-0 text-[11px] text-white/85">
              <span className="font-semibold text-[#FEE500]">{slotIndex + 1}번</span>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void unpin()}
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] text-white/50 active:bg-white/10"
            >
              해제
            </button>
          </>
        ) : (
          <>
            {pinIcon}
            {slotButtons}
            {pinError === "roster_full" ? (
              <span className="shrink-0 text-[10px] text-amber-300">가득</span>
            ) : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-white/[0.08] bg-[#161618] px-2 py-1">
      {pinIcon}
      {connected && slotIndex !== undefined ? (
        <>
          <span className="min-w-0 flex-1 text-[11px] text-white/85">
            ROOM{" "}
            <span className="font-semibold text-[#FEE500]">{slotIndex + 1}번</span>
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void unpin()}
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] text-white/55 active:bg-white/10"
          >
            해제
          </button>
        </>
      ) : (
        <>
          <span className="shrink-0 text-[11px] text-white/55">고정</span>
          <div className="flex flex-1 justify-end">{slotButtons}</div>
        </>
      )}
      {pinError === "roster_full" && !connected ? (
        <span className="shrink-0 text-[11px] text-amber-300">가득</span>
      ) : null}
    </div>
  );
}
