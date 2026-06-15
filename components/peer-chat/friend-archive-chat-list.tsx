"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { formatRelativeKo } from "@/lib/time/format-relative-ko";
import type { ArchiveChatRow } from "@/lib/social/archive-chat-rows";
import { cn } from "@/lib/utils";

export type FriendArchiveChatListProps = {
  rows: readonly ArchiveChatRow[];
  onSelect?: (threadId: string) => void;
  className?: string;
};

function StackedProfileStrip({ rows }: { rows: readonly ArchiveChatRow[] }) {
  const top = rows.slice(0, 6);
  if (top.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center px-4 pb-1 pt-2">
      <div className="flex items-center">
        {top.map((peer, index) => (
          <span
            key={peer.threadId}
            className={cn(
              "relative inline-flex rounded-full ring-2 ring-rimvio-base",
              index > 0 && "-ml-2.5",
            )}
            style={{ zIndex: top.length - index }}
          >
            <PeerProfileAvatar
              displayName={peer.displayName}
              avatarUrl={peer.avatarUrl}
              size="xs"
            />
            {peer.unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-400 ring-1 ring-rimvio-base" />
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FriendArchiveChatList({
  rows,
  onSelect,
  className,
}: FriendArchiveChatListProps) {
  const [collapsed, setCollapsed] = useState(false);

  const unreadTotal = useMemo(
    () => rows.reduce((sum, row) => sum + row.unreadCount, 0),
    [rows],
  );

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
          className,
        )}
      >
        <p className="text-sm text-[#6b7684]">주머니가 비어 있어요</p>
        <p className="max-w-[16rem] text-[11px] leading-relaxed text-[#8b95a1]">
          친구를 추가하면 프로필이 여기에 쌓여요
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left active:bg-[#f2f4f6]"
        aria-expanded={!collapsed}
      >
        <span className="text-[15px] font-semibold text-[#191f28]">
          친구 {rows.length}
        </span>
        {unreadTotal > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            새 톡 {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        ) : null}
        <span className="ml-auto text-[#8b95a1]">
          {collapsed ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronUp className="size-4" aria-hidden />
          )}
        </span>
      </button>

      {!collapsed ? <StackedProfileStrip rows={rows} /> : null}

      {!collapsed ? (
        <ul className="min-h-0 flex-1 divide-y divide-[#0220470f] overflow-y-auto overscroll-y-contain">
          {rows.map((row) => {
            const href = `/peers/${encodeURIComponent(row.threadId)}`;
            return (
              <li key={row.threadId}>
                <Link
                  href={href}
                  onClick={() => onSelect?.(row.threadId)}
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-[#f2f4f6]"
                >
                  <PeerProfileAvatar
                    displayName={row.displayName}
                    avatarUrl={row.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[#191f28]">
                      {row.displayName}
                    </p>
                    <p className="truncate text-[13px] text-[#6b7684]">
                      {row.lastMessage?.trim() ||
                        (row.unreadCount > 0
                          ? `새 메시지 ${row.unreadCount}`
                          : "대화 시작")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 pl-1">
                    <span className="text-[11px] tabular-nums text-[#8b95a1]">
                      {formatRelativeKo(row.lastActivityAt)}
                    </span>
                    {row.unreadCount > 0 ? (
                      <span className="flex min-w-[1.125rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900">
                        {row.unreadCount > 99 ? "99+" : row.unreadCount}
                      </span>
                    ) : (
                      <span className="size-2.5" aria-hidden />
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
