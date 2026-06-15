"use client";

import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { useMemo } from "react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import type { GroupThreadListItem } from "@/components/peer-chat/group-thread-list";
import { useCopy } from "@/hooks/use-copy";
import { prefetchPeerMessages } from "@/lib/peer-chat/message-prefetch-cache";
import type { ArchiveChatRow } from "@/lib/social/archive-chat-rows";
import { formatRelativeKo } from "@/lib/time/format-relative-ko";
import { cn } from "@/lib/utils";

export type PeerFriendsRailProps = {
  rows: readonly ArchiveChatRow[];
  groups?: readonly GroupThreadListItem[];
  onAddFriend: () => void;
  onCreateGroup?: () => void;
  className?: string;
};

export function PeerFriendsRail({
  rows,
  groups = [],
  onAddFriend,
  onCreateGroup,
  className,
}: PeerFriendsRailProps) {
  const copy = useCopy();

  const unreadTotal = useMemo(
    () => rows.reduce((sum, row) => sum + row.unreadCount, 0),
    [rows],
  );

  const hasGroups = groups.length > 0;

  return (
    <section
      className={cn("flex min-h-0 flex-1 flex-col bg-rimvio-base", className)}
      data-peer-friends-rail
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[#0220470f] px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold tracking-tight text-[#191f28]">
            {copy.peers.friendRail.title}
          </h2>
          {rows.length > 0 ? (
            <p className="text-[11px] text-[#6b7684]">
              {copy.peers.friendRail.subtitle(rows.length)}
              {unreadTotal > 0
                ? ` · ${copy.peers.friendRail.unread(unreadTotal)}`
                : ""}
            </p>
          ) : (
            <p className="text-[11px] text-[#6b7684]">
              {copy.peers.friendRail.emptyHint}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onAddFriend}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#3182f6] text-white shadow-sm active:scale-95"
          aria-label={copy.peers.friendAdd.listCta}
        >
          <UserPlus className="size-5" aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {hasGroups || onCreateGroup ? (
          <div className="border-b border-[#0220470f] px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6b7684]">
                {copy.peers.friendRail.groupsSection}
              </p>
              {onCreateGroup ? (
                <button
                  type="button"
                  onClick={onCreateGroup}
                  className="text-[12px] font-semibold text-[#3182f6]"
                >
                  {copy.peers.friendRail.createGroup}
                </button>
              ) : null}
            </div>
            {hasGroups ? (
              <ul className="space-y-1">
                {groups.map((group) => (
                  <li key={group.threadId}>
                    <Link
                      href={`/peers/${encodeURIComponent(group.threadId)}`}
                      className="flex items-center gap-3 rounded-xl px-1 py-2 active:bg-[#f2f4f6]"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f2f4f6] text-[#4e5968]">
                        <Users className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#191f28]">
                        {group.displayName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : onCreateGroup ? (
              <button
                type="button"
                onClick={onCreateGroup}
                className="flex w-full items-center gap-3 rounded-xl py-2 text-left active:bg-[#f2f4f6]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8f3ff] text-[#3182f6]">
                  <Users className="size-4" aria-hidden />
                </span>
                <span className="text-[14px] font-semibold text-[#191f28]">
                  {copy.peers.friendRail.createGroupFirst}
                </span>
              </button>
            ) : null}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-[#6b7684]">{copy.peers.friendRail.empty}</p>
            <button
              type="button"
              onClick={onAddFriend}
              className="rimvio-accent-submit-btn rounded-full px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm active:scale-[0.98]"
            >
              {copy.peers.friendAdd.listCta}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[#0220470f]">
            {rows.map((row) => {
              const href = `/peers/${encodeURIComponent(row.threadId)}`;
              return (
                <li key={row.threadId}>
                  <Link
                    href={href}
                    onMouseEnter={() => prefetchPeerMessages(row.threadId)}
                    onTouchStart={() => prefetchPeerMessages(row.threadId)}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-[#f2f4f6]"
                  >
                    <PeerProfileAvatar
                      displayName={row.displayName}
                      avatarUrl={row.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[16px] font-semibold text-[#191f28]">
                        <span className="truncate">{row.displayName}</span>
                        {row.isPinned ? (
                          <span className="shrink-0 rounded bg-[#e8f3ff] px-1.5 py-0.5 text-[9px] font-bold text-[#3182f6]">
                            {copy.peers.friendRail.pinnedBadge}
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[13px] text-[#6b7684]">
                        {row.lastMessage?.trim() ||
                          (row.unreadCount > 0
                            ? copy.peers.friendRail.newMessages(row.unreadCount)
                            : copy.peers.friendRail.startChat)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 pl-1">
                      <span className="text-[11px] tabular-nums text-[#8b95a1]">
                        {formatRelativeKo(row.lastActivityAt)}
                      </span>
                      {row.unreadCount > 0 ? (
                        <span className="flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-slate-900">
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
        )}
      </div>
    </section>
  );
}
