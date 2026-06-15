"use client";

import {
  Calendar,
  Link2,
  MapPin,
  Play,
  Sparkles,
  Ticket,
  Wallet,
} from "lucide-react";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { lensActionCardVisual } from "@/lib/peer-chat/lens-action-card-presentation";
import { cn } from "@/lib/utils";

type LensActionMediaCardProps = {
  candidate: DeepLinkBubbleCandidate;
  onSelect: (candidate: DeepLinkBubbleCandidate) => void;
  disabled?: boolean;
  /** 카드 상단 — 인스타 릴스처럼 프로필+아이디 */
  owner?: {
    displayName: string;
    avatarUrl?: string | null;
    rimvioId?: string | null;
  };
  className?: string;
};

function LensActionIcon({
  kind,
  className,
}: {
  kind: ReturnType<typeof lensActionCardVisual>["icon"];
  className?: string;
}) {
  const props = { className, strokeWidth: 2.1, "aria-hidden": true as const };
  switch (kind) {
    case "calendar":
      return <Calendar {...props} />;
    case "map":
      return <MapPin {...props} />;
    case "link":
      return <Link2 {...props} />;
    case "ticket":
      return <Ticket {...props} />;
    case "wallet":
      return <Wallet {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}

/** 인스타 릴/카드처럼 탭해서 실행하는 AI Lens 액션 카드 */
export function LensActionMediaCard({
  candidate,
  onSelect,
  disabled = false,
  owner,
  className,
}: LensActionMediaCardProps) {
  const visual = lensActionCardVisual(candidate.actionType);
  const ownerName = owner?.displayName?.trim() || "AI Lens";
  const handle = owner?.rimvioId?.trim();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(candidate)}
      title={candidate.reason}
      className={cn(
        "group relative w-full max-w-[13.5rem] overflow-hidden rounded-2xl text-left",
        "ring-1 ring-white/15 shadow-[0_10px_28px_-12px_rgba(0,0,0,0.55)]",
        "transition-transform active:scale-[0.98] disabled:opacity-45",
        className,
      )}
      aria-label={`${candidate.label} — ${visual.subtitle}`}
    >
      <div
        className={cn(
          "relative aspect-[4/5] w-full bg-gradient-to-br",
          visual.gradient,
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.22),transparent_55%)]" />

        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1.5 px-2.5 py-2">
          <PeerProfileAvatar
            displayName={ownerName}
            avatarUrl={owner?.avatarUrl}
            size="xs"
            className="ring-1 ring-white/25"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-white">
              {ownerName}
            </p>
            {handle ? (
              <p className="truncate text-[10px] text-white/75">@{handle}</p>
            ) : (
              <p className="text-[10px] text-white/65">AI Lens</p>
            )}
          </div>
        </div>

        <div className="absolute inset-0 z-[1] flex items-center justify-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-black/35 ring-1 ring-white/30 backdrop-blur-sm transition group-hover:bg-black/45">
            <Play className="size-5 fill-white text-white" aria-hidden />
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-2.5 pb-2.5 pt-10">
          <div className="flex items-start gap-1.5">
            <LensActionIcon
              kind={visual.icon}
              className="mt-0.5 size-3.5 shrink-0 text-white/90"
            />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-snug text-white">
                {candidate.label.replace(/^[^\s]+\s/, "")}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/75">
                {visual.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
