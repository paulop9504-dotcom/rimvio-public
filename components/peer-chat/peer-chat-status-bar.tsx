"use client";

import { Radio, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PeerChatStatusBarProps = {
  realtime: boolean;
  syncError: string | null;
  phoneDm?: boolean;
  className?: string;
};

export function PeerChatStatusBar({
  realtime,
  syncError,
  phoneDm = false,
  className,
}: PeerChatStatusBarProps) {
  if (!syncError && !realtime) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-2",
        className,
      )}
    >
      {realtime ? (
        <span className="rimvio-dm-live-pill inline-flex items-center gap-1.5">
          <Radio className="size-3" aria-hidden />
          실시간 연결
        </span>
      ) : null}
      {phoneDm && realtime ? (
        <span className="text-[10px] text-white/40">
          @ai 질문 · AI 답변은 나만 보기
        </span>
      ) : null}
      {syncError ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/50 px-2 py-0.5 text-[10px] text-amber-200">
          <WifiOff className="size-3 shrink-0" aria-hidden />
          {syncError} · 로컬 저장만
        </span>
      ) : null}
    </div>
  );
}
