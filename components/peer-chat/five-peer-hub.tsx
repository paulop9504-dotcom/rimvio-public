"use client";

import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FriendArchiveBagBubble } from "@/components/peer-chat/friend-archive-bag-bubble";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import {
  ARCHIVE_BAG_STROKE,
  buildFivePeerHubNodes,
  FIVE_PEER_HUB_LINE_COLORS,
  PINNED_CONNECTION_STROKE,
} from "@/lib/context/five-peer-hub-layout";
import { BUBBLE_RING_CLASS } from "@/lib/social/bubble-state";
import type { BubbleState, SocialBubblePeer } from "@/lib/social/bubble-state";
import {
  clampHubPoint,
  clampHubPositionsToBounds,
  defaultHubNodePositions,
  readHubNodePositions,
  resolveHubDragBounds,
  writeHubNodePositions,
  type HubNodePoint,
  type HubNodePositions,
} from "@/lib/context/five-peer-hub-positions";
import type { PinnedPeerRoster, PinnedSlotIndex } from "@/lib/context/peer-thread-types";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { prefetchPeerMessages } from "@/lib/peer-chat/message-prefetch-cache";
import { cn } from "@/lib/utils";

type FivePeerHubProps = {
  roster: PinnedPeerRoster;
  centerLabel: string;
  centerInitial: string;
  centerAvatarUrl?: string | null;
  peerMetaByThread?: Map<string, SocialBubblePeer>;
  /** Per-friend AI 렌즈 toggle (long-press profile on hub). */
  lensEnabledByThreadId?: ReadonlyMap<string, boolean>;
  onTogglePeerLens?: (peerThreadId: string) => void;
  archiveBag?: {
    href?: string;
    count: number;
    unreadTotal: number;
    bubbleState: BubbleState;
    previewPeers: SocialBubblePeer[];
  };
  onArchiveBagOpen?: () => void;
  onAssignSlot: (slotIndex: number) => void;
  className?: string;
};

type DragTarget = "center" | PinnedSlotIndex;

type DragSession = {
  target: DragTarget;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

function lineKey(node: ReturnType<typeof buildFivePeerHubNodes>[number]) {
  if (node.kind === "vacant") {
    return `vacant-${node.slotIndex}`;
  }
  return `${node.kind}-${node.slot.peerThreadId}`;
}

function nodePosition(positions: HubNodePositions, slotIndex: PinnedSlotIndex): HubNodePoint {
  return positions.slots[slotIndex];
}

const LENS_LINE_BLUR_ID = "rimvio-hub-lens-line-blur";

export function FivePeerHub({
  roster,
  centerLabel,
  centerInitial,
  centerAvatarUrl,
  peerMetaByThread,
  lensEnabledByThreadId,
  onTogglePeerLens,
  archiveBag,
  onArchiveBagOpen,
  onAssignSlot,
  className,
}: FivePeerHubProps) {
  const nodes = buildFivePeerHubNodes(roster.slots);
  const containerRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<HubNodePositions>(defaultHubNodePositions());
  const dragRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const [positions, setPositions] = useState<HubNodePositions>(defaultHubNodePositions);

  useEffect(() => {
    const stored = readHubNodePositions();
    positionsRef.current = stored;
    setPositions(stored);
  }, []);

  const commitPositions = useCallback((next: HubNodePositions) => {
    positionsRef.current = next;
    setPositions(next);
    writeHubNodePositions(next);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const syncBounds = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const clamped = clampHubPositionsToBounds(positionsRef.current, rect.width, rect.height);
      if (
        clamped.center.x !== positionsRef.current.center.x ||
        clamped.center.y !== positionsRef.current.center.y ||
        ([0, 1, 2, 3, 4] as PinnedSlotIndex[]).some(
          (slotIndex) =>
            clamped.slots[slotIndex].x !== positionsRef.current.slots[slotIndex].x ||
            clamped.slots[slotIndex].y !== positionsRef.current.slots[slotIndex].y,
        )
      ) {
        commitPositions(clamped);
      }
    };

    syncBounds();
    const observer = new ResizeObserver(syncBounds);
    observer.observe(node);
    return () => observer.disconnect();
  }, [commitPositions]);

  const clientToPoint = useCallback((clientX: number, clientY: number): HubNodePoint => {
    const rect = containerRef.current?.getBoundingClientRect();
    const session = dragRef.current;
    if (!rect || rect.width <= 0 || rect.height <= 0 || !session) {
      return positionsRef.current.center;
    }

    const bounds = resolveHubDragBounds(
      rect.width,
      rect.height,
      session.target === "center" ? "center" : "peer",
    );

    return clampHubPoint(
      {
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      },
      bounds,
    );
  }, []);

  const updateDraggedPoint = useCallback(
    (point: HubNodePoint) => {
      const session = dragRef.current;
      if (!session) {
        return;
      }

      const prev = positionsRef.current;
      if (session.target === "center") {
        commitPositions({ ...prev, center: point });
        return;
      }

      commitPositions({
        ...prev,
        slots: {
          ...prev.slots,
          [session.target]: point,
        },
      });
    },
    [commitPositions],
  );

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const beginDrag = useCallback(
    (target: DragTarget, peerThreadId?: string) =>
      (event: React.PointerEvent<HTMLElement>) => {
        event.preventDefault();
        suppressClickRef.current = false;
        clearLongPress();
        dragRef.current = {
          target,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
        };
        if (peerThreadId && onTogglePeerLens) {
          longPressTimerRef.current = window.setTimeout(() => {
            if (dragRef.current && !dragRef.current.moved) {
              suppressClickRef.current = true;
              onTogglePeerLens(peerThreadId);
            }
            clearLongPress();
          }, 520);
        }
        event.currentTarget.setPointerCapture(event.pointerId);
      },
    [clearLongPress, onTogglePeerLens],
  );

  const moveDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const session = dragRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
      if (distance > 6) {
        session.moved = true;
        suppressClickRef.current = true;
        clearLongPress();
      }

      if (!session.moved) {
        return;
      }

      updateDraggedPoint(clientToPoint(event.clientX, event.clientY));
    },
    [clientToPoint, updateDraggedPoint, clearLongPress],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
    clearLongPress();
  }, [clearLongPress]);

  const dragSurfaceProps = (
    target: DragTarget,
    extraClass?: string,
    onTap?: () => void,
    peerThreadId?: string,
  ) => ({
    onPointerDown: beginDrag(target, peerThreadId),
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      if (suppressClickRef.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
        return;
      }
      onTap?.();
    },
    className: cn(
      "cursor-grab touch-none active:cursor-grabbing",
      target === "center" ? "absolute z-30" : "absolute z-20",
      extraClass,
    ),
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full select-none overflow-hidden touch-none",
        className,
      )}
      style={{ touchAction: "none" }}
      role="navigation"
      aria-label="관계 버블 · 친한 5 + 구슬 주머니"
    >
      <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" aria-hidden>
        <defs>
          <filter id={LENS_LINE_BLUR_ID} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.45" />
          </filter>
        </defs>
        {nodes.map((node, index) => {
          const slotIndex = (node.kind === "vacant" ? node.slotIndex : node.slot.slotIndex) as PinnedSlotIndex;
          const peerPoint = nodePosition(positions, slotIndex);
          const active = node.kind === "connected";
          const stroke = active ? PINNED_CONNECTION_STROKE : FIVE_PEER_HUB_LINE_COLORS[index];
          const threadId =
            node.kind === "connected" ? node.slot.peerThreadId : null;
          const lensOn =
            Boolean(threadId) && lensEnabledByThreadId?.get(threadId!) === true;

          return (
            <g key={`line-${lineKey(node)}`}>
              {lensOn ? (
                <line
                  x1={positions.center.x}
                  y1={positions.center.y}
                  x2={peerPoint.x}
                  y2={peerPoint.y}
                  stroke={stroke}
                  strokeWidth="0.95"
                  strokeLinecap="round"
                  opacity={0.35}
                  filter={`url(#${LENS_LINE_BLUR_ID})`}
                />
              ) : null}
              <line
                x1={positions.center.x}
                y1={positions.center.y}
                x2={peerPoint.x}
                y2={peerPoint.y}
                stroke={stroke}
                strokeWidth={active ? "0.6" : "0.4"}
                strokeLinecap="round"
                opacity={lensOn ? 0.92 : active ? 0.85 : 0.4}
              />
            </g>
          );
        })}
        {archiveBag ? (
          <line
            x1={positions.center.x}
            y1={positions.center.y}
            x2={positions.archiveBag.x}
            y2={positions.archiveBag.y}
            stroke={ARCHIVE_BAG_STROKE}
            strokeWidth="0.55"
            strokeLinecap="round"
            strokeDasharray="1.2 0.8"
            opacity={0.75}
          />
        ) : null}
      </svg>

      <div
        {...dragSurfaceProps("center")}
        style={{
          left: `${positions.center.x}%`,
          top: `${positions.center.y}%`,
          transform: "translate(-50%, -50%)",
          touchAction: "none",
        }}
        aria-label={centerLabel}
      >
        <div className="flex flex-col items-center">
          <div
            className="relative flex size-[5.25rem] items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 p-[3px] shadow-[0_8px_24px_rgba(99,102,241,0.18)]"
            aria-hidden
          >
            <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-secondary text-xl font-semibold text-foreground shadow-inner">
              {centerAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={centerAvatarUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                centerInitial
              )}
            </div>
          </div>
          <p className="mt-2 max-w-[7rem] truncate text-center text-xs font-semibold text-[#191f28]">
            {centerLabel}
          </p>
        </div>
      </div>

      {nodes.map((node, index) => {
        const slotIndex = (node.kind === "vacant" ? node.slotIndex : node.slot.slotIndex) as PinnedSlotIndex;
        const point = nodePosition(positions, slotIndex);
        const color = FIVE_PEER_HUB_LINE_COLORS[index];
        const style = {
          left: `${point.x}%`,
          top: `${point.y}%`,
          transform: "translate(-50%, -50%)",
          touchAction: "none" as const,
        };

        if (node.kind === "connected" && node.slot.peerThreadId) {
          const href = `/peers/${encodeURIComponent(node.slot.peerThreadId)}`;
          const meta = peerMetaByThread?.get(node.slot.peerThreadId);
          const isGroup =
            node.slot.roomKind === "group" ||
            isGroupThreadId(node.slot.peerThreadId);
          const bubbleState: BubbleState = meta?.bubbleState ?? "idle";
          const displayName =
            meta?.displayName?.trim() ||
            node.slot.displayName?.trim() ||
            meta?.rimvioId ||
            (isGroup ? "단톡" : "친구");
          const rimvioId = meta?.rimvioId ?? null;
          const lensOn = lensEnabledByThreadId?.get(node.slot.peerThreadId!);

          return (
            <Link
              key={node.slot.peerThreadId}
              href={href}
              onMouseEnter={() => prefetchPeerMessages(node.slot.peerThreadId!)}
              onTouchStart={() => prefetchPeerMessages(node.slot.peerThreadId!)}
              {...dragSurfaceProps(
                slotIndex,
                "flex flex-col items-center gap-1 active:scale-95",
                undefined,
                node.slot.peerThreadId!,
              )}
              style={style}
              aria-label={
                lensOn ? `${displayName} · AI 렌즈 켜짐` : displayName
              }
            >
              {isGroup ? (
                <span
                  className={cn(
                    "flex size-[3.75rem] items-center justify-center rounded-full border-2 bg-secondary text-muted-foreground",
                    BUBBLE_RING_CLASS[bubbleState],
                    lensOn &&
                      "ring-2 ring-cyan-400/45 shadow-[0_0_14px_rgba(34,211,238,0.22)]",
                  )}
                >
                  <Users className="size-6" aria-hidden />
                </span>
              ) : (
                <PeerProfileAvatar
                  displayName={displayName}
                  avatarUrl={meta?.avatarUrl}
                  size="md"
                  className={cn(
                    "!size-[3.75rem] !text-lg border-2 bg-rimvio-surface",
                    BUBBLE_RING_CLASS[bubbleState],
                    lensOn &&
                      "ring-2 ring-cyan-400/45 shadow-[0_0_14px_rgba(34,211,238,0.22)]",
                  )}
                />
              )}
              <span className="flex max-w-[5.5rem] flex-col items-center leading-tight">
                <span className="w-full truncate text-center text-[10px] font-semibold text-[#191f28]">
                  {displayName}
                </span>
                {isGroup ? (
                  <span className="w-full truncate text-center text-[9px] text-[#6b7684]">
                    단톡
                  </span>
                ) : rimvioId ? (
                  <span className="w-full truncate text-center text-[9px] font-medium text-[#1b64da]">
                    @{rimvioId}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        }

        if (node.kind === "vacant") {
          return (
            <button
              key={`vacant-${node.slotIndex}`}
              type="button"
              {...dragSurfaceProps(
                node.slotIndex,
                "flex flex-col items-center gap-1 active:scale-95",
                () => onAssignSlot(node.slotIndex),
              )}
              style={style}
              aria-label={`${node.slotIndex + 1}번 AI 허브 · 친구 또는 단톡`}
            >
              <span className="relative flex size-[3.75rem] items-center justify-center rounded-full border-2 border-border bg-secondary shadow-sm">
                <Plus className="size-5 text-[#6b7684]" strokeWidth={2} aria-hidden />
                <span className="absolute -bottom-0.5 rounded-full bg-white px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide text-[#4e5968] shadow-sm ring-1 ring-[#0220470f]">
                  {node.roomLabel}
                </span>
              </span>
            </button>
          );
        }

        return null;
      })}

      {archiveBag ? (
        <div
          className="absolute z-20"
          style={{
            left: `${positions.archiveBag.x}%`,
            top: `${positions.archiveBag.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <FriendArchiveBagBubble
            href={archiveBag.href}
            onOpen={onArchiveBagOpen}
            count={archiveBag.count}
            unreadTotal={archiveBag.unreadTotal}
            bubbleState={archiveBag.bubbleState}
            previewPeers={archiveBag.previewPeers}
          />
        </div>
      ) : null}

      <p className="sr-only">
        AI 허브 5명 · 친구 프로필을 길게 누르면 AI 렌즈를 켜거나 끌 수 있어요. 프로필을 드래그해
        배치할 수 있어요.
      </p>
    </div>
  );
}
