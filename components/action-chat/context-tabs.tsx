"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock, Link2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { FixedContainerSlot } from "@/components/action-chat/fixed-container-bar";
import { formatLinkContextTime } from "@/lib/feed/format-link-context-time";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import { ACTION_CHAT } from "@/lib/ui/action-chat-theme";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 420;

type ActionChatContextTabsProps = {
  links: LinkRow[];
  activeIndex: number;
  onSelect: (index: number) => void;
  chainedLinkIds?: Set<string>;
  hybridLabel?: string;
  isHybrid?: boolean;
  chainedLinks?: LinkRow[];
  onSnap?: (draggedId: string, targetId: string) => void;
  onSelectLink?: (linkId: string) => void;
  onRemoveFromChain?: (linkId: string) => void;
  onClearChain?: () => void;
  containerHoverSlot?: FixedContainerSlot | null;
  onSnapToContainer?: (slot: FixedContainerSlot, linkId: string) => void;
  scheduledLinkIds?: Set<string>;
  onScheduleLink?: (linkId: string) => void;
  className?: string;
};

function ContextTabCard({
  link,
  index,
  active,
  inChain,
  dragging,
  enlarged,
  isHoverTarget,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onClick,
  onSchedule,
  isScheduled,
}: {
  link: LinkRow;
  index: number;
  active: boolean;
  inChain: boolean;
  dragging: boolean;
  enlarged: boolean;
  isHoverTarget: boolean;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onClick: () => void;
  onSchedule?: () => void;
  isScheduled?: boolean;
}) {
  const title = getDisplayTitleForLink(link);
  const thumb = link.thumbnail_url?.trim();

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
      animate={{
        scale: enlarged ? 1.08 : dragging ? 1.04 : 1,
        zIndex: enlarged || dragging ? 20 : 1,
      }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={cn(
        "context-tab-card relative flex min-w-[8.5rem] max-w-[9.5rem] shrink-0 touch-none select-none flex-col gap-1.5 rounded-2xl p-2 text-left transition-colors",
        active || inChain
          ? "rimvio-edge-card rimvio-edge-card--sm bg-rimvio-surface shadow-[0_0_20px_rgba(191,90,242,0.15)]"
          : "bg-rimvio-surface-muted opacity-85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]",
        dragging && "context-tab-card--dragging",
        isHoverTarget && "context-tab-card--snap-target"
      )}
    >
      <button
        type="button"
        aria-label={isScheduled ? "예약됨" : "시간 예약"}
        onClick={(event) => {
          event.stopPropagation();
          onSchedule?.();
        }}
        className={cn(
          "absolute right-1.5 top-1.5 rimvio-icon-btn rimvio-icon-btn--sm",
          isScheduled
            ? "rimvio-icon-btn--green"
            : "rimvio-icon-btn--ghost"
        )}
      >
        <Clock className="size-3.5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="size-9 shrink-0 overflow-hidden rounded-xl bg-rimvio-surface-raised">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="size-full object-cover" />
          ) : (
            <div
              className="flex size-full items-center justify-center text-[10px] font-bold"
              style={{ color: ACTION_CHAT.accent }}
            >
              G
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-foreground">{title}</p>
          <p className="text-[10px] text-[#9CA3AF]">
            {formatLinkContextTime(link.created_at)}
          </p>
        </div>
      </div>
      {inChain ? (
        <span className="text-[9px] font-semibold uppercase tracking-wide text-[#7B61FF]">
          연결됨 · {index + 1}순위
        </span>
      ) : null}
    </motion.button>
  );
}

export function ActionChatContextTabs({
  links,
  activeIndex,
  onSelect,
  chainedLinkIds = new Set<string>(),
  hybridLabel = "",
  isHybrid = false,
  chainedLinks = [],
  onSnap,
  onSelectLink,
  onRemoveFromChain,
  onClearChain,
  containerHoverSlot = null,
  onSnapToContainer,
  scheduledLinkIds = new Set<string>(),
  onScheduleLink,
  className,
}: ActionChatContextTabsProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [enlargedId, setEnlargedId] = useState<string | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handlePressStart = useCallback(
    (linkId: string) => {
      clearPressTimer();
      pressTimer.current = window.setTimeout(() => {
        setEnlargedId(linkId);
        setDragId(linkId);
      }, LONG_PRESS_MS);
    },
    [clearPressTimer]
  );

  const handlePressEnd = useCallback(() => {
    clearPressTimer();
    if (dragId && containerHoverSlot) {
      onSnapToContainer?.(containerHoverSlot, dragId);
    } else if (dragId && hoverTargetId && dragId !== hoverTargetId) {
      onSnap?.(dragId, hoverTargetId);
    }
    setDragId(null);
    setEnlargedId(null);
    setHoverTargetId(null);
  }, [clearPressTimer, containerHoverSlot, dragId, hoverTargetId, onSnap, onSnapToContainer]);

  return (
    <div className={cn("px-4 pb-2", className)}>
      <AnimatePresence mode="popLayout">
        {isHybrid ? (
          <motion.div
            key="link-hybrid"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="container-chain-hybrid mb-2"
          >
            <div className="container-chain-hybrid__glow" />
            <div className="flex items-start gap-2">
              <div className="container-chain-hybrid__icon">
                <Link2 className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#1F2937]">
                  [{hybridLabel}]
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#6B7280]">
                  {chainedLinks.length}개 맥락 연결 · AI가 두 주제를 함께 봅니다
                </p>
              </div>
              {onClearChain ? (
                <button
                  type="button"
                  onClick={onClearChain}
                  className="shrink-0 text-[10px] font-medium text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  해제
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chainedLinks.map((link, chainIndex) => (
                <span
                  key={link.id}
                  className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-[#374151]"
                >
                  {(getDisplayTitleForLink(link) ?? link.title).slice(0, 14)}
                  {chainIndex === 0 ? (
                    <span className="text-[#7B61FF]">주</span>
                  ) : null}
                  {onRemoveFromChain ? (
                    <button
                      type="button"
                      aria-label="연결 해제"
                      onClick={() => onRemoveFromChain(link.id)}
                      className="text-[#9CA3AF] hover:text-[#6B7280]"
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex gap-2 overflow-x-auto pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((link, index) => {
          const active = index === activeIndex;
          const inChain = chainedLinkIds.has(link.id);
          const isDragging = dragId === link.id;
          const isEnlarged = enlargedId === link.id;
          const isHoverTarget = Boolean(
            dragId && dragId !== link.id && hoverTargetId === link.id
          );

          return (
            <div
              key={link.id}
              onPointerEnter={() => {
                if (dragId && dragId !== link.id) {
                  setHoverTargetId(link.id);
                }
              }}
            >
              <ContextTabCard
                link={link}
                index={chainedLinks.findIndex((item) => item.id === link.id)}
                active={active}
                inChain={inChain}
                dragging={isDragging}
                enlarged={isEnlarged}
                isHoverTarget={isHoverTarget}
                onPointerDown={() => handlePressStart(link.id)}
                onPointerUp={handlePressEnd}
                onPointerLeave={() => {
                  if (hoverTargetId === link.id) {
                    setHoverTargetId(null);
                  }
                  if (enlargedId === link.id && !dragId) {
                    clearPressTimer();
                    setEnlargedId(null);
                  }
                }}
                onClick={() => {
                  if (!dragId) {
                    onSelectLink?.(link.id);
                    onSelect(index);
                  }
                }}
                onSchedule={() => onScheduleLink?.(link.id)}
                isScheduled={scheduledLinkIds.has(link.id)}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-1.5 text-[10px] text-[#9CA3AF]">
        맥락 탭을 꾹 눌러 다른 탭 위에 놓으면 Snap · 짧게 탭하면 선택
      </p>
    </div>
  );
}
