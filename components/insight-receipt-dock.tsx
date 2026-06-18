"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { InsightDockAccent } from "@/lib/feed/insight-dock-label";
import { cn } from "@/lib/utils";

const ACCENT_STYLES: Record<
  InsightDockAccent,
  { strip: string; chevron: string; collapseOverlay: string; collapseInline: string }
> = {
  study: {
    strip: "bg-[#fffdf8]/95 ring-[#7C3AED]/20",
    chevron: "text-[#7C3AED]",
    collapseOverlay:
      "bg-white/15 text-white/90 ring-white/20 backdrop-blur-sm",
    collapseInline:
      "bg-[#f2f2f7] text-muted-foreground ring-black/[0.06]",
  },
  commerce: {
    strip: "bg-[#fffdf8]/95 ring-amber-500/20",
    chevron: "text-amber-700",
    collapseOverlay:
      "bg-white/15 text-white/90 ring-white/20 backdrop-blur-sm",
    collapseInline:
      "bg-[#f2f2f7] text-muted-foreground ring-black/[0.06]",
  },
  time: {
    strip: "bg-[#f5f4ff]/95 ring-[#5856D6]/20",
    chevron: "text-[#5856D6]",
    collapseOverlay:
      "bg-white/15 text-white/90 ring-white/20 backdrop-blur-sm",
    collapseInline:
      "bg-[#f2f2f7] text-muted-foreground ring-black/[0.06]",
  },
  neutral: {
    strip: "bg-[#fffdf8]/95 ring-black/[0.08]",
    chevron: "text-muted-foreground",
    collapseOverlay:
      "bg-white/15 text-white/90 ring-white/20 backdrop-blur-sm",
    collapseInline:
      "bg-[#f2f2f7] text-muted-foreground ring-black/[0.06]",
  },
};

type InsightReceiptDockProps = {
  dockLabel: string;
  collapseLabel?: string;
  accent?: InsightDockAccent;
  overlay?: boolean;
  defaultCollapsed?: boolean;
  children: ReactNode;
};

/** Collapsible insight shell — dock strip when collapsed, full card when expanded. */
export function InsightReceiptDock({
  dockLabel,
  collapseLabel = "접기",
  accent = "neutral",
  overlay = false,
  defaultCollapsed = false,
  children,
}: InsightReceiptDockProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const styles = ACCENT_STYLES[accent];

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left ring-1",
          "backdrop-blur-md transition active:scale-[0.99]",
          styles.strip
        )}
        aria-expanded={false}
        aria-label={`${dockLabel} 펼치기`}
      >
        <span className="min-w-0 truncate text-[11px] font-semibold text-foreground">
          {dockLabel}
        </span>
        <ChevronUp className={cn("size-4 shrink-0", styles.chevron)} aria-hidden />
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      {children}
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className={cn(
          "flex w-full items-center justify-center gap-1 rounded-xl px-3 py-2",
          "text-[11px] font-semibold ring-1 transition active:scale-[0.98]",
          overlay ? styles.collapseOverlay : styles.collapseInline
        )}
        aria-expanded
      >
        {collapseLabel}
        <ChevronDown className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
