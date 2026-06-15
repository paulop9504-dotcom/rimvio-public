"use client";

import { Globe, X } from "lucide-react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import type { PeerPublicProfile } from "@/lib/peer-chat/peer-chat-client";
import { cn } from "@/lib/utils";

type PeerPublicProfileSheetProps = {
  open: boolean;
  onClose: () => void;
  profile: PeerPublicProfile | null;
  fallbackName: string;
  loading?: boolean;
  /** DM/group thread — filters pins this peer may see on owner's globe. */
  peerThreadId?: string | null;
};

export function PeerPublicProfileSheet({
  open,
  onClose,
  profile,
  fallbackName,
  loading = false,
  peerThreadId = null,
}: PeerPublicProfileSheetProps) {
  if (!open) {
    return null;
  }

  const name = profile?.displayName?.trim() || fallbackName;
  const rimvioId = profile?.rimvioId;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
        role="dialog"
        aria-modal
        aria-label="친구 프로필"
        onClick={onClose}
      >
        <div
          className={cn(
            "w-full max-w-sm rounded-3xl border border-white/10 bg-rimvio-surface p-6 shadow-xl",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-rimvio-surface-muted"
              aria-label="닫기"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="flex flex-col items-center gap-3 pb-2">
            <PeerProfileAvatar
              displayName={name}
              avatarUrl={profile?.avatarUrl}
              size="lg"
            />
            {loading ? (
              <p className="text-sm text-muted-foreground">불러오는 중…</p>
            ) : (
              <>
                <p className="text-center text-lg font-semibold text-white">{name}</p>
                {rimvioId ? (
                  <p className="font-mono text-sm text-rimvio-neon-cyan">@{rimvioId}</p>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    Rimvio ID 미등록
                  </p>
                )}
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500/15 px-4 py-3 text-[14px] font-semibold text-sky-100 ring-1 ring-sky-300/25 active:bg-sky-500/25"
                  onClick={() => {
                    window.location.assign("/");
                  }}
                >
                  <Globe className="size-4" aria-hidden />
                  지구 보기
                </button>
                <p className="mt-1 text-center text-[11px] text-muted-foreground">
                  권한 있는 핀만 보여요 · 전화번호·이메일은 비공개
                </p>
              </>
            )}
          </div>
        </div>
      </div>

    </>
  );
}
