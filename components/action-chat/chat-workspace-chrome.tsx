"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { rimvioHeaderChromeClass, rimvioIconBtnClass } from "@/lib/brand/rimvio-neon-theme";
import { cn } from "@/lib/utils";

type ChatWorkspaceChromeProps = {
  expanded: boolean;
  onToggle: () => void;
  subtitle?: string;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function ChatWorkspaceChrome({
  expanded,
  onToggle,
  subtitle,
  header,
  children,
  className,
}: ChatWorkspaceChromeProps) {
  return (
    <div className={cn(rimvioHeaderChromeClass, "shrink-0", className)}>
      {header}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span
          aria-hidden
          className={cn(rimvioIconBtnClass("secondary", "sm"), "pointer-events-none")}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground">
            {expanded ? "맥락·컨테이너 접기" : "맥락·컨테이너 펼치기"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {expanded
              ? "캘린더 · 데이터 · 맥락 탭"
              : subtitle ?? "Snap · 일정 · 리소스 풀"}
          </p>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="workspace-expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="max-h-[min(46dvh,360px)] overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
