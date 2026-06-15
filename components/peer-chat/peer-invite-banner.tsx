"use client";

import { useState } from "react";
import { Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PeerInviteBannerProps = {
  inviteUrl: string | null;
  inviteCode: string | null;
  className?: string;
};

export function PeerInviteBanner({
  inviteUrl,
  inviteCode,
  className,
}: PeerInviteBannerProps) {
  const [copied, setCopied] = useState(false);

  if (!inviteUrl || !inviteCode) {
    return null;
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("초대 링크를 복사했어요");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했어요");
    }
  };

  return (
    <div
      className={cn(
        "border-b border-rimvio-neon-cyan/20 bg-rimvio-neon-cyan/5 px-3 py-2.5",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 size-4 shrink-0 text-rimvio-neon-cyan" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-foreground">
            친구 초대 — 실시간 1:1 채팅
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            링크를 내면 같은 대화방에서 메시지가 바로 보여요
          </p>
          <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
            코드: {inviteCode}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-rimvio-surface px-2.5 py-1.5 text-[10px] font-medium active:scale-[0.98]"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-500" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {copied ? "복사됨" : "링크 복사"}
        </button>
      </div>
    </div>
  );
}
