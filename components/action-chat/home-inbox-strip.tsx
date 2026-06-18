"use client";

import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type HomeInboxStripProps = {
  count: number;
  onOpen: () => void;
  className?: string;
};

export function HomeInboxStrip({ count, onOpen, className }: HomeInboxStripProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <section className={cn("px-4 pb-2", className)} aria-label="인박스">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-left transition-colors hover:bg-amber-50"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-rimvio-surface text-amber-600 shadow-sm">
          <Inbox className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#92400E]">INBOX</p>
          <p className="text-[11px] text-[#B45309]">분류 대기 {count}개 · 정리하기</p>
        </div>
      </button>
    </section>
  );
}
