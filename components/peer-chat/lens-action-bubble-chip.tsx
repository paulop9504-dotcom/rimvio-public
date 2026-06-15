"use client";

import {
  Calendar,
  Link2,
  MapPin,
  Sparkles,
  Ticket,
  Wallet,
} from "lucide-react";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { lensActionCardVisual } from "@/lib/peer-chat/lens-action-card-presentation";
import { cn } from "@/lib/utils";

type LensActionBubbleChipProps = {
  candidate: DeepLinkBubbleCandidate;
  onSelect: (candidate: DeepLinkBubbleCandidate) => void;
  disabled?: boolean;
  className?: string;
};

function chipLabel(label: string): string {
  return label.replace(/^[^\p{L}\p{N}]+/u, "").trim() || label.trim();
}

function LensChipIcon({
  kind,
  className,
}: {
  kind: ReturnType<typeof lensActionCardVisual>["icon"];
  className?: string;
}) {
  const props = { className, strokeWidth: 2.2, "aria-hidden": true as const };
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

const TONE_CLASS: Record<
  ReturnType<typeof lensActionCardVisual>["icon"],
  string
> = {
  map: "border-sky-300/70 bg-sky-50 text-sky-950",
  link: "border-border bg-muted text-foreground",
  wallet: "border-emerald-300/70 bg-emerald-50 text-emerald-950",
  calendar: "border-violet-300/70 bg-violet-50 text-violet-950",
  ticket: "border-fuchsia-300/70 bg-fuchsia-50 text-fuchsia-950",
  sparkles: "border-border bg-muted text-foreground",
};

/** Compact chat bubble — one tap runs deeplink (nav, open link, etc.). */
export function LensActionBubbleChip({
  candidate,
  onSelect,
  disabled = false,
  className,
}: LensActionBubbleChipProps) {
  const visual = lensActionCardVisual(candidate.actionType);
  const text = chipLabel(candidate.label);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(candidate)}
      title={candidate.reason}
      className={cn(
        "inline-flex max-w-[min(72vw,14rem)] items-center gap-1.5 rounded-full border px-2.5 py-1.5",
        "text-[12px] font-semibold leading-none transition active:scale-[0.97]",
        "disabled:opacity-45",
        TONE_CLASS[visual.icon],
        className,
      )}
      aria-label={`${text} — ${visual.subtitle}`}
    >
      <LensChipIcon kind={visual.icon} className="size-3.5 shrink-0 opacity-90" />
      <span className="truncate">{text}</span>
    </button>
  );
}
