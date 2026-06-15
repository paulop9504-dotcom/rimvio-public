"use client";

import Link from "next/link";
import { ActionCard } from "@/components/action-card";
import { useRealtimeLinksOptional } from "@/hooks/use-realtime-links";

export function ArchiveFeedList() {
  const realtime = useRealtimeLinksOptional();
  const archivedLinks = realtime?.archivedLinks ?? [];

  if (!archivedLinks.length) {
    return (
      <div className="rounded-3xl bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          보관함이 비어 있어요.
        </p>
        <Link
          href="/"
          className="mt-3 inline-block text-xs text-muted-foreground/80 hover:text-muted-foreground"
        >
          ← 메인으로
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {archivedLinks.map((link, index) => (
        <ActionCard key={link.id} link={link} index={index} />
      ))}
      <div className="pt-2 text-center">
        <Link
          href="/"
          className="text-xs text-muted-foreground/80 transition-colors hover:text-muted-foreground"
        >
          ← 메인으로
        </Link>
      </div>
    </div>
  );
}
