"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { listPeersForTalk } from "@/lib/peer-chat/list-peers-for-talk";
import { resolvePeerPartnerUserId } from "@/lib/peer-chat/resolve-peer-partner-user-id";
import type { GlobeContextShareFriend } from "@/lib/experience-bridge/share-context-with-friends";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export type GlobeCreateContextShareStepProps = {
  selectedIds: ReadonlySet<string>;
  onToggle: (friend: GlobeContextShareFriend) => void;
  loading?: boolean;
  className?: string;
};

type ShareRow = GlobeContextShareFriend & {
  rimvioId?: string | null;
};

export function GlobeCreateContextShareStep({
  selectedIds,
  onToggle,
  loading = false,
  className,
}: GlobeCreateContextShareStepProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      setFetching(true);
      const contacts = listPeersForTalk();
      const resolved: ShareRow[] = [];
      for (const contact of contacts) {
        const userId = await resolvePeerPartnerUserId(
          contact.peerThreadId,
          user?.id,
        );
        if (!userId) {
          continue;
        }
        resolved.push({
          userId,
          peerThreadId: contact.peerThreadId,
          displayName:
            contact.profileDisplayName?.trim() ||
            contact.displayName.trim() ||
            contact.roomDisplayName?.trim() ||
            "친구",
          rimvioId: contact.rimvioId,
        });
      }
      if (active) {
        setRows(resolved);
        setFetching(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const sorted = useMemo(
    () =>
      [...rows].sort((left, right) =>
        left.displayName.localeCompare(right.displayName, "ko"),
      ),
    [rows],
  );

  const toggleRow = useCallback(
    (row: ShareRow) => {
      onToggle({
        userId: row.userId,
        displayName: row.displayName,
        peerThreadId: row.peerThreadId,
      });
    },
    [onToggle],
  );

  if (fetching) {
    return (
      <p className="flex items-center gap-2 py-8 text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        친구 목록 불러오는 중…
      </p>
    );
  }

  if (sorted.length === 0) {
    return (
      <p className="rounded-2xl bg-muted/50 px-4 py-6 text-center text-[13px] leading-relaxed text-muted-foreground">
        아직 친구가 없어요.
        <br />
        친구 탭에서 추가한 뒤 다시 공유해 보세요.
      </p>
    );
  }

  return (
    <ul className={cn("space-y-2", className)} data-globe-create-context-share>
      {sorted.map((row) => {
        const selected = selectedIds.has(row.userId);
        return (
          <li key={row.userId}>
            <button
              type="button"
              disabled={loading}
              onClick={() => toggleRow(row)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/25"
                  : "border-border bg-muted/30",
                loading && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                <UserRound className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-foreground">
                  {row.displayName}
                </span>
                {row.rimvioId ? (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    @{row.rimvioId}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "size-5 shrink-0 rounded-full border-2",
                  selected ? "border-primary bg-primary" : "border-muted-foreground/40",
                )}
                aria-hidden
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
