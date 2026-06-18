"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { IOS } from "@/lib/ui/ios-surface";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import { cn } from "@/lib/utils";

type FriendArchivePanelProps = {
  archive: SocialBubblePeer[];
  className?: string;
};

export function FriendArchivePanel({
  archive,
  className,
}: FriendArchivePanelProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return archive;
    }
    return archive.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        (p.rimvioId?.toLowerCase().includes(q) ?? false),
    );
  }, [archive, query]);

  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-white">Friend Archive</h2>
        <span className="text-[11px] text-white/55">{archive.length}명</span>
      </div>
      <p className="px-1 text-[11px] text-white/50">
        고정하지 않은 친구 · 대화는 7일 후 삭제 · 관계는 유지
      </p>

      <div className={cn("flex items-center gap-2 px-3 py-2", IOS.cardSm)}>
        <Search className="size-4 shrink-0 text-white/45" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 · @Rimvio ID 검색"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl bg-rimvio-surface-muted px-4 py-5 text-center text-xs text-white/55">
          {archive.length === 0
            ? "아카이브에 친구가 없어요"
            : "검색 결과가 없어요"}
        </p>
      ) : (
        <ul className={cn("divide-y divide-border overflow-hidden", IOS.cardSm)}>
          {filtered.map((peer) => {
            const href = `/peers/${encodeURIComponent(peer.threadId)}`;
            return (
              <li key={peer.threadId}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-4 py-3 active:bg-rimvio-surface-muted"
                >
                  <PeerProfileAvatar
                    displayName={peer.displayName}
                    avatarUrl={peer.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                      {peer.displayName}
                    </p>
                    <p className="truncate text-[11px] text-white/55">
                      {peer.rimvioId ? `@${peer.rimvioId}` : "1:1"}
                      {peer.unreadCount > 0
                        ? ` · 새 메시지 ${peer.unreadCount}`
                        : ""}
                      {peer.messagesPurgeAfter
                        ? " · 7일 보관"
                        : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
