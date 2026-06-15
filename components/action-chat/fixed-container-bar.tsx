"use client";

import { motion } from "framer-motion";
import { Calendar, FolderGit2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  FIXED_CALENDAR_CONTAINER_ID,
  FIXED_DATA_CONTAINER_ID,
} from "@/lib/knowledge/knowledge-entity-types";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 420;

export type FixedContainerSlot =
  | typeof FIXED_CALENDAR_CONTAINER_ID
  | typeof FIXED_DATA_CONTAINER_ID;

const SLOTS = [
  {
    id: FIXED_CALENDAR_CONTAINER_ID,
    label: "캘린더",
    hint: "일정 · 액션",
    icon: Calendar,
    accent: "#10B981",
  },
  {
    id: FIXED_DATA_CONTAINER_ID,
    label: "리소스풀",
    hint: "메모 · 링크 · 사진",
    icon: FolderGit2,
    accent: "#BF5AF2",
  },
] as const;

type FixedContainerBarProps = {
  activeSlot?: FixedContainerSlot | null;
  hoverSlot?: FixedContainerSlot | null;
  activeActionCount?: number;
  resourcePoolCount?: number;
  onSelectSlot: (slot: FixedContainerSlot) => void;
  onOpenCalendar?: () => void;
  onOpenResourcePool?: () => void;
  onSnapToSlot?: (slot: FixedContainerSlot) => void;
  onHoverSlot?: (slot: FixedContainerSlot | null) => void;
  className?: string;
};

export function FixedContainerBar({
  activeSlot = null,
  hoverSlot = null,
  activeActionCount = 0,
  resourcePoolCount = 0,
  onSelectSlot,
  onOpenCalendar,
  onOpenResourcePool,
  onSnapToSlot,
  onHoverSlot,
  className,
}: FixedContainerBarProps) {
  return (
    <div
      className={cn(
        "fixed-container-bar shrink-0 border-b border-white/[0.06] bg-rimvio-surface-muted/80 px-4 py-2 backdrop-blur-md",
        className,
      )}
    >
      <div className="grid grid-cols-2 gap-2">
        {SLOTS.map((slot) => {
          const Icon = slot.icon;
          const active = activeSlot === slot.id;
          const hover = hoverSlot === slot.id;
          const badge =
            slot.id === FIXED_CALENDAR_CONTAINER_ID
              ? activeActionCount
              : resourcePoolCount;

          return (
            <motion.button
              key={slot.id}
              type="button"
              layout
              onClick={() => {
                onSelectSlot(slot.id);
                if (slot.id === FIXED_CALENDAR_CONTAINER_ID) {
                  onOpenCalendar?.();
                } else {
                  onOpenResourcePool?.();
                }
                onSnapToSlot?.(slot.id);
              }}
              onPointerEnter={() => onHoverSlot?.(slot.id)}
              onPointerLeave={() => onHoverSlot?.(null)}
              animate={{ scale: hover ? 1.03 : 1 }}
              className={cn(
                "fixed-container-bar__slot flex items-center gap-2 rounded-2xl border p-2 text-left transition-colors",
                active
                  ? "border-[color-mix(in_srgb,var(--slot-accent)_40%,transparent)] bg-rimvio-surface shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--slot-accent)_30%,transparent)]"
                  : "border-white/10 bg-rimvio-surface/90",
                hover && "fixed-container-bar__slot--snap-target",
              )}
              style={{ ["--slot-accent" as string]: slot.accent }}
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${slot.accent}18`, color: slot.accent }}
              >
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-[12px] font-semibold text-white">{slot.label}</p>
                  {badge > 0 ? (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                      style={{ backgroundColor: slot.accent }}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-[10px] text-white/45">{slot.hint}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function useFixedContainerBarSnap() {
  const [hoverSlot, setHoverSlot] = useState<FixedContainerSlot | null>(null);
  const [activeSlot, setActiveSlot] = useState<FixedContainerSlot | null>(null);

  const snapLinkToSlot = useCallback(
    (slot: FixedContainerSlot, onSnap?: (slot: FixedContainerSlot) => void) => {
      setActiveSlot(slot);
      onSnap?.(slot);
    },
    [],
  );

  return {
    hoverSlot,
    activeSlot,
    setHoverSlot,
    setActiveSlot,
    snapLinkToSlot,
  };
}

export function useLongPressDrag(onLongPress: () => void) {
  const timer = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    timer.current = window.setTimeout(onLongPress, LONG_PRESS_MS);
  }, [clear, onLongPress]);

  const end = useCallback(() => {
    clear();
  }, [clear]);

  return { start, end, clear };
}
