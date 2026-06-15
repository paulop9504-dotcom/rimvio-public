"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Link2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useContainerChain } from "@/hooks/use-container-chain";
import { normalizeContainerKey } from "@/lib/containers/container-types";
import type { ContextContainer } from "@/lib/containers/context-containers";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 420;

type ContainerChainStripProps = {
  className?: string;
};

function ContainerChip({
  container,
  active,
  dragging,
  enlarged,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onClick,
}: {
  container: ContextContainer;
  active: boolean;
  dragging: boolean;
  enlarged: boolean;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onClick: () => void;
}) {
  const accent = container.accent ?? "#4A90E2";

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
        scale: enlarged ? 1.12 : dragging ? 1.06 : 1,
        zIndex: enlarged || dragging ? 20 : 1,
      }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={cn(
        "container-chain-chip relative shrink-0 select-none touch-none",
        active && "container-chain-chip--active",
        dragging && "container-chain-chip--dragging"
      )}
      style={{
        ["--chip-accent" as string]: accent,
      }}
    >
      <span
        className="container-chain-chip__dot"
        style={{ backgroundColor: accent }}
      />
      <span className="container-chain-chip__label">{container.title}</span>
    </motion.button>
  );
}

export function ContainerChainStrip({ className }: ContainerChainStripProps) {
  const {
    containers,
    activeChains,
    hybridLabel,
    isHybrid,
    selectContainer,
    snapTo,
    removeFromChain,
    clearChain,
  } = useContainerChain();

  const [dragId, setDragId] = useState<string | null>(null);
  const [enlargedId, setEnlargedId] = useState<string | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);
  const activeIds = new Set(activeChains);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handlePressStart = useCallback(
    (containerId: string) => {
      clearPressTimer();
      pressTimer.current = window.setTimeout(() => {
        setEnlargedId(containerId);
        setDragId(containerId);
      }, LONG_PRESS_MS);
    },
    [clearPressTimer]
  );

  const handlePressEnd = useCallback(() => {
    clearPressTimer();
    if (dragId && hoverTargetId && dragId !== hoverTargetId) {
      snapTo(dragId, hoverTargetId);
    }
    setDragId(null);
    setEnlargedId(null);
    setHoverTargetId(null);
  }, [clearPressTimer, dragId, hoverTargetId, snapTo]);

  if (containers.length === 0) {
    return null;
  }

  return (
    <section className={cn("container-chain-strip px-4 pb-2", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
          컨테?�너
        </p>
        {activeChains.length > 0 ? (
          <button
            type="button"
            onClick={clearChain}
            className="text-[10px] font-medium text-[#9CA3AF] underline-offset-2 hover:text-muted-foreground hover:underline"
          >
            ?�결 ?�제
          </button>
        ) : null}
      </div>

      <AnimatePresence mode="popLayout">
        {isHybrid ? (
          <motion.div
            key="hybrid"
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
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  activeChains = {JSON.stringify(activeChains)}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeChains.map((key) => {
                const container = containers.find(
                  (item) => item.id === key || item.id.includes(key)
                );
                const label = container?.title ?? key;
                return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-full bg-rimvio-surface/80 px-2 py-0.5 text-[10px] font-medium text-[#374151]"
                >
                  {label}
                  <button
                    type="button"
                    aria-label={`${label} ?�결 ?�제`}
                    onClick={() => removeFromChain(key)}
                    className="text-[#9CA3AF] hover:text-muted-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              );})}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {containers.map((container) => {
          const canonical = normalizeContainerKey(container.id);
          const isActive = Boolean(canonical && activeIds.has(canonical));
          const isDragging = dragId === container.id;
          const isEnlarged = enlargedId === container.id;
          const isHoverTarget =
            Boolean(dragId && dragId !== container.id && hoverTargetId === container.id);

          return (
            <div
              key={container.id}
              onPointerEnter={() => {
                if (dragId && dragId !== container.id) {
                  setHoverTargetId(container.id);
                }
              }}
              className={cn(isHoverTarget && "container-chain-chip-wrap--snap-target")}
            >
              <ContainerChip
                container={container}
                active={isActive}
                dragging={isDragging}
                enlarged={isEnlarged}
                onPointerDown={() => handlePressStart(container.id)}
                onPointerUp={handlePressEnd}
                onPointerLeave={() => {
                  if (hoverTargetId === container.id) {
                    setHoverTargetId(null);
                  }
                  if (enlargedId === container.id && !dragId) {
                    clearPressTimer();
                    setEnlargedId(null);
                  }
                }}
                onClick={() => {
                  if (!dragId) {
                    selectContainer(container.id);
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-1 text-[10px] text-[#9CA3AF]">
        �??�러 ?�어???�으�?Snap · ??���??�일 ?�택
      </p>
    </section>
  );
}
