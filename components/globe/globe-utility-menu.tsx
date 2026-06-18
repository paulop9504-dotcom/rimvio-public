"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Inbox, MoreHorizontal, Settings } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

export type GlobeUtilityMenuProps = {
  mediaPoolCount: number;
  inboxCount: number;
  onOpenMediaPool: () => void;
  onOpenInbox: () => void;
  onOpenSettings: () => void;
  className?: string;
};

function formatBadgeCount(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count > 9 ? "9+" : String(count);
}

/** Top-right globe tools — one chip; expand for media · inbox · settings. */
export function GlobeUtilityMenu({
  mediaPoolCount,
  inboxCount,
  onOpenMediaPool,
  onOpenInbox,
  onOpenSettings,
  className,
}: GlobeUtilityMenuProps) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingTotal = mediaPoolCount + inboxCount;
  const badge = formatBadgeCount(pendingTotal);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const rows = [
    {
      id: "inbox" as const,
      icon: Inbox,
      label: copy.globe.utilityMenuInbox,
      badge: formatBadgeCount(inboxCount),
      onPress: () => {
        setOpen(false);
        onOpenInbox();
      },
    },
    {
      id: "media" as const,
      icon: ImagePlus,
      label: copy.globe.utilityMenuMedia,
      badge: formatBadgeCount(mediaPoolCount),
      onPress: () => {
        setOpen(false);
        onOpenMediaPool();
      },
    },
    {
      id: "settings" as const,
      icon: Settings,
      label: copy.globe.utilityMenuSettings,
      badge: null,
      onPress: () => {
        setOpen(false);
        onOpenSettings();
      },
    },
  ];

  const primaryRow =
    inboxCount > 0 ? rows[0] : mediaPoolCount > 0 ? rows[1] : rows[2];

  return (
    <div ref={rootRef} className={cn("relative", className)} data-globe-utility-menu>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative flex h-10 items-center gap-1.5 rounded-full bg-card/95 pl-3 pr-2.5 text-foreground shadow-sm ring-1 ring-border backdrop-blur-md active:scale-[0.98]",
          open && "ring-primary/30",
        )}
        aria-expanded={open}
        aria-label={copy.globe.utilityMenuTriggerAria}
        data-globe-utility-menu-trigger
      >
        <MoreHorizontal className="size-4 shrink-0 text-primary" aria-hidden />
        {!open ? (
          <span className="max-w-[5.5rem] truncate text-[11px] font-semibold">
            {primaryRow.label}
          </span>
        ) : null}
        {badge ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 py-px text-[10px] font-bold leading-none text-primary-foreground">
            {badge}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+0.35rem)] z-30 min-w-[10.5rem] overflow-hidden rounded-[1rem] border border-border/70 bg-card/98 p-1 shadow-lg ring-1 ring-border/50 backdrop-blur-xl"
            role="menu"
          >
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.id}
                  type="button"
                  role="menuitem"
                  onClick={row.onPress}
                  className="flex w-full items-center gap-2.5 rounded-[0.75rem] px-2.5 py-2 text-left active:bg-muted/80"
                  data-globe-utility-menu-item={row.id}
                >
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-foreground">
                    {row.label}
                  </span>
                  {row.badge ? (
                    <span className="rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {row.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
