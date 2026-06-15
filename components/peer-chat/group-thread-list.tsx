"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Users } from "lucide-react";
import { findSlotByPeerId } from "@/lib/context/pinned-peer-roster";
import { readPinnedRoster } from "@/lib/context/peer-thread-settings-store";
import { cn } from "@/lib/utils";

export type GroupThreadListItem = {
  threadId: string;
  displayName: string;
};

type GroupThreadListProps = {
  groups: readonly GroupThreadListItem[];
  onCreate: () => void;
  className?: string;
};

function GroupPinBadge({ threadId }: { threadId: string }) {
  const roster = useMemo(() => readPinnedRoster(), []);
  const slot = findSlotByPeerId(roster, threadId);
  if (slot?.connection !== "connected" || slot.slotIndex === undefined) {
    return null;
  }
  return (
    <span className="shrink-0 rounded-full bg-[#3182f6]/12 px-2 py-0.5 text-[10px] font-bold text-[#1b64da]">
      {slot.slotIndex + 1}번
    </span>
  );
}

export function GroupThreadList({ groups, onCreate, className }: GroupThreadListProps) {
  return (
    <section className={cn("mx-1 space-y-2", className)} aria-label="단톡 목록">
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#6b7684]">
          단톡
        </h3>
        <button
          type="button"
          onClick={onCreate}
          className="text-[12px] font-semibold text-[#3182f6]"
        >
          + 만들기
        </button>
      </div>

      {groups.length === 0 ? (
        <button
          type="button"
          onClick={onCreate}
          className="flex w-full items-center gap-3 rounded-2xl border border-[#0220470f] bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-[#f8f9fb]"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#e8f3ff] text-[#3182f6]">
            <Users className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-[#191f28]">첫 단톡 만들기</span>
            <span className="mt-0.5 block text-[12px] text-[#6b7684]">
              친구 여러 명과 함께 약속·일정을 맞춰 보세요
            </span>
          </span>
        </button>
      ) : (
        <ul className="space-y-1.5">
          {groups.map((group) => (
            <li key={group.threadId}>
              <Link
                href={`/peers/${encodeURIComponent(group.threadId)}`}
                className="flex items-center gap-3 rounded-2xl border border-[#0220470f] bg-white px-4 py-3 shadow-sm transition-colors hover:bg-[#f8f9fb]"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#f2f4f6] text-[#4e5968]">
                  <Users className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#191f28]">
                  {group.displayName}
                </span>
                <GroupPinBadge threadId={group.threadId} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
