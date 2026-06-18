"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Link2,
  MessageCircle,
  SendHorizonal,
  Sparkles,
} from "lucide-react";
import { RoomQuickPanel } from "@/components/room-quick-panel";
import { cleanFeedActionLabel } from "@/lib/feed/feed-display";
import { findSimilarLinks } from "@/lib/links/similar-links";
import { findRoomSparkLinks } from "@/lib/links/room-spark-links";
import { useCopy, useAppLocale } from "@/hooks/use-copy";
import { useHomeCountry } from "@/hooks/use-home-country";
import { resolveHomeCountry } from "@/lib/preferences/home-country";
import type { LinkCommentRow, LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type DockPanel = "comments" | "peers" | "sparks" | null;

type RoomActionDockProps = {
  link: LinkRow;
  primary?: LinkRow["actions"][number];
  phaseHint?: string | null;
  roomLinks: LinkRow[];
  isDone: boolean;
  comments: LinkCommentRow[];
  recentCommentIds?: Set<string>;
  onPrimary: () => void | Promise<void>;
  onDone: () => void | Promise<void>;
  onComment: (input: {
    kind: LinkCommentRow["kind"];
    message: string;
  }) => void | Promise<void>;
  onOpenPeer?: (link: LinkRow) => void;
  onSendToFriend?: () => void;
};

function DockIconButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  active,
  badge,
}: {
  label: string;
  icon: typeof CheckCircle2;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-colors",
        "disabled:opacity-35",
        active ? "bg-rimvio-neon-purple/10" : "active:bg-rimvio-surface-muted"
      )}
    >
      <span className="relative">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-2xl",
            active
              ? "bg-rimvio-neon-purple/12 text-rimvio-neon-cyan"
              : "bg-rimvio-surface-muted text-foreground/85 ring-1 ring-rimvio-neon-purple/12"
          )}
        >
          <Icon className="size-[1.125rem]" strokeWidth={2} />
        </span>
        {badge && badge > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rimvio-neon-purple text-[9px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </button>
  );
}

export function RoomActionDock({
  link,
  primary: primaryAction,
  phaseHint,
  roomLinks,
  isDone,
  comments,
  recentCommentIds,
  onPrimary,
  onDone,
  onComment,
  onOpenPeer,
  onSendToFriend,
}: RoomActionDockProps) {
  const [panel, setPanel] = useState<DockPanel>(null);
  const copy = useCopy();
  const locale = useAppLocale();
  const primary = primaryAction ?? link.actions[0];
  const primaryLabel = cleanFeedActionLabel(primary?.label ?? copy.actions.openLink, locale);
  const isYouTube = link.domain.includes("youtube");
  const { homeCountry } = useHomeCountry();

  const peers = useMemo(
    () => findSimilarLinks(link, roomLinks, 4),
    [link, roomLinks]
  );
  const sparks = useMemo(
    () =>
      findRoomSparkLinks(link, roomLinks, 3, {
        homeCountry: homeCountry ?? resolveHomeCountry(),
      }),
    [link, roomLinks, homeCountry]
  );

  const openPeers = () => {
    if (peers.length === 1) {
      onOpenPeer?.(peers[0]);
      return;
    }
    setPanel("peers");
  };

  const openSparks = () => {
    if (sparks.length === 1) {
      window.open(sparks[0].url, "_blank", "noopener,noreferrer");
      return;
    }
    setPanel("sparks");
  };

  return (
    <>
      <div className="mt-2 shrink-0 space-y-2.5">
        <button
          type="button"
          disabled={isDone}
          onClick={() => void onPrimary()}
          className={cn(
            "flex h-[3.25rem] w-full items-center justify-center rounded-[16px]",
            "text-[17px] font-semibold text-white transition-transform active:scale-[0.98]",
            isDone && "opacity-45",
            isYouTube
              ? "bg-[#ff0033] hover:bg-[#e6002e]"
              : "bg-rimvio-neon-purple hover:bg-[#0077ED]"
          )}
        >
          {primaryLabel}
        </button>

        {phaseHint ? (
          <p className="text-center text-[12px] text-rimvio-neon-cyan/85">{phaseHint}</p>
        ) : null}

        <div className="grid grid-cols-4 gap-1">
          <DockIconButton
            label={copy.room.dockDone}
            icon={CheckCircle2}
            disabled={isDone}
            onClick={() => void onDone()}
          />
          <DockIconButton
            label={copy.room.dockComment}
            icon={MessageCircle}
            active={panel === "comments"}
            badge={comments.length}
            onClick={() => setPanel("comments")}
          />
          <DockIconButton
            label={copy.room.dockSimilar}
            icon={Link2}
            disabled={peers.length === 0}
            badge={peers.length}
            onClick={openPeers}
          />
          <DockIconButton
            label={copy.room.dockSpark}
            icon={Sparkles}
            disabled={sparks.length === 0}
            badge={sparks.length}
            onClick={openSparks}
          />
        </div>

        <button
          type="button"
          onClick={onSendToFriend}
          className={cn(
            "flex min-h-[2.85rem] w-full items-center justify-center gap-2 rounded-2xl",
            "bg-muted/45 text-sm font-semibold text-foreground ring-1 ring-border/40",
            "transition-transform active:scale-[0.98]"
          )}
        >
          <SendHorizonal className="size-4" strokeWidth={2.25} />
          {copy.room.dockSendFriend}
        </button>
      </div>

      <RoomQuickPanel
        open={panel === "comments"}
        onOpenChange={(open) => setPanel(open ? "comments" : null)}
        title={copy.room.dockComment}
        kind="comments"
        comments={comments}
        recentCommentIds={recentCommentIds}
        isDone={isDone}
        onComment={onComment}
      />
      <RoomQuickPanel
        open={panel === "peers"}
        onOpenChange={(open) => setPanel(open ? "peers" : null)}
        title={copy.room.dockSimilar}
        kind="peers"
        peers={peers}
        onOpenPeer={onOpenPeer}
      />
      <RoomQuickPanel
        open={panel === "sparks"}
        onOpenChange={(open) => setPanel(open ? "sparks" : null)}
        title={copy.room.dockSpark}
        kind="sparks"
        sparks={sparks}
      />
    </>
  );
}
