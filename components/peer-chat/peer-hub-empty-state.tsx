"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type PeerHubEmptyStateProps = {
  className?: string;
  onAddFriend: () => void;
};

export function PeerHubEmptyState({
  className,
  onAddFriend,
}: PeerHubEmptyStateProps) {
  const copy = useCopy();

  return (
    <section
      className={cn(
        "mx-1 space-y-3 rounded-2xl border border-dashed border-[#02204714] bg-[#f8f9fb] p-4",
        className,
      )}
      aria-label={copy.peers.emptyTitle}
    >
      <h2 className="text-[14px] font-semibold text-foreground">{copy.peers.emptyTitle}</h2>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{copy.peers.emptyBody}</p>
      <button
        type="button"
        onClick={onAddFriend}
        className="rimvio-accent-submit-btn flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white"
      >
        <UserPlus className="size-4" aria-hidden />
        {copy.peers.emptyAddCta}
      </button>
      <Link
        href="/feed"
        className="block w-full py-2 text-center text-[12px] font-medium text-rimvio-neon-cyan"
      >
        {copy.peers.emptyFeedLink} →
      </Link>
    </section>
  );
}
