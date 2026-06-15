"use client";

import { createElement, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  Bookmark,
  Copy,
  ExternalLink,
  Link2,
  MapPin,
  Play,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { runLinkAction } from "@/lib/actions/execute-link-action";
import {
  analyticsFromEnriched,
  endAnalyticsFlow,
  runAndTrackLinkAction,
  trackFunnel,
} from "@/lib/analytics/track-client";
import {
  launchExternalUrl,
  shadowAction,
} from "@/lib/action-shadowing";
import type { EnrichedLink, EnricherContext } from "@/lib/enrichers/types";
import { getDisplayTitle } from "@/lib/feed/sanitize-link-title";
import { toActionKey } from "@/lib/intent/action-key";
import { trackActionBinEvent } from "@/lib/intent/track-client";
import type { LinkActionItem } from "@/types/database";
import {
  getDomainGradient,
  getDomainInitial,
} from "@/lib/utils/domain-gradient";
import { cn } from "@/lib/utils";

const actionIcons: Record<LinkActionItem["kind"], LucideIcon> = {
  open: ExternalLink,
  save: Bookmark,
  share: Share2,
  remind: Bell,
  copy: Copy,
  custom: Sparkles,
};

function iconForAction(action: LinkActionItem): LucideIcon {
  const payloadIcon = action.payload?.icon;

  if (payloadIcon === "taxi") {
    return MapPin;
  }
  if (payloadIcon === "kakaomap") {
    return MapPin;
  }
  if (payloadIcon === "youtube") {
    return Play;
  }
  if (payloadIcon === "timestamp") {
    return Play;
  }
  if (payloadIcon === "link") {
    return Link2;
  }
  if (payloadIcon === "external-link") {
    return ExternalLink;
  }

  return actionIcons[action.kind];
}

type NowActionFocusProps = {
  enriched: EnrichedLink;
  context: EnricherContext;
  onStack: () => void;
};

function isYouTubeEnriched(enriched: EnrichedLink) {
  return enriched.source_type === "youtube" || enriched.domain.includes("youtube");
}

function HeroThumbnail({ enriched }: { enriched: EnrichedLink }) {
  const isYouTube = isYouTubeEnriched(enriched);
  const gradient = isYouTube
    ? "from-red-500/90 via-rose-500/85 to-orange-400/80"
    : getDomainGradient(enriched.domain);
  const initial = isYouTube ? "▶" : getDomainInitial(enriched.domain);

  if (enriched.image) {
    return (
      <div
        className={cn(
          "relative mx-auto size-32 overflow-hidden rounded-3xl shadow-lg ring-1",
          isYouTube ? "ring-red-500/15" : "ring-black/5"
        )}
      >
        <Image
          src={enriched.image}
          alt=""
          fill
          className="object-cover"
          sizes="96px"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto flex size-32 items-center justify-center rounded-3xl bg-gradient-to-br shadow-lg ring-1",
        gradient,
        isYouTube ? "ring-red-500/15" : "ring-black/5"
      )}
    >
      <span className="text-4xl font-semibold text-white/95">{initial}</span>
    </div>
  );
}

async function runPrimaryAction(
  action: LinkActionItem,
  enriched: EnrichedLink
) {
  const { copiedText } = await runAndTrackLinkAction(
    action,
    analyticsFromEnriched(enriched, "now")
  );
  if (copiedText) {
    toast.success(`"${copiedText}" 복사됨`);
  }
}

export function NowActionFocus({
  enriched,
  context,
  onStack,
}: NowActionFocusProps) {
  const router = useRouter();
  const primary = enriched.actions[0];
  const secondary = enriched.actions.slice(1, 4);
  const PrimaryIcon = primary ? iconForAction(primary) : ExternalLink;
  const isYouTube = isYouTubeEnriched(enriched);
  const displayTitle = getDisplayTitle({
    title: enriched.title,
    original_url: enriched.url,
    domain: enriched.domain,
    source_type: enriched.source_type,
  });
  const [isExiting, setIsExiting] = useState(false);
  const [didPrimary, setDidPrimary] = useState(false);

  useEffect(() => {
    if (!primary) {
      return;
    }

    trackActionBinEvent({
      context,
      actionKey: toActionKey(primary),
      event: "impression",
    });
  }, [context, primary]);

  const finish = () => {
    if (isExiting) {
      return;
    }

    if (!didPrimary && primary) {
      trackActionBinEvent({
        context,
        actionKey: toActionKey(primary),
        event: "skip",
      });
    }

    trackFunnel("now_done", {
      domain: enriched.domain,
      enricher_id: enriched.enricher_id,
    });
    endAnalyticsFlow();

    setIsExiting(true);
    onStack();
  };

  const handlePrimary = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }

    if (primary) {
      setDidPrimary(true);
      trackActionBinEvent({
        context,
        actionKey: toActionKey(primary),
        event: "click",
      });
      trackFunnel("now_action", {
        domain: enriched.domain,
        enricher_id: enriched.enricher_id,
      });

      shadowAction(primary, {
        router,
        fallbackHref: enriched.url,
        intent: "touch",
      });
      void runPrimaryAction(primary, enriched);
    } else {
      launchExternalUrl(enriched.url);
    }

    finish();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[calc(100dvh-2rem)] flex-col items-center justify-center px-4 py-6 text-center"
    >
      <HeroThumbnail enriched={enriched} />

      {displayTitle ? (
        <h2 className="mt-7 max-w-[20rem] text-[1.65rem] font-semibold leading-tight tracking-tight">
          {displayTitle}
        </h2>
      ) : null}
      <p className={cn("text-sm text-muted-foreground", displayTitle ? "mt-2" : "mt-7")}>
        {isYouTube ? "YouTube" : enriched.domain}
      </p>

      <div className="mt-10 w-full max-w-md">
        <button
          type="button"
          disabled={isExiting}
          onClick={handlePrimary}
          className={cn(
            "group relative flex w-full items-center justify-center gap-3",
            "rounded-full px-8 py-8 backdrop-blur-2xl",
            "text-[1.5rem] font-semibold tracking-tight",
            "transition-[transform,box-shadow,opacity,background-color,border-color] duration-200",
            "active:scale-[0.97] active:opacity-95",
            "disabled:pointer-events-none disabled:opacity-60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            isYouTube
              ? [
                  "border border-red-500/20 bg-red-500/[0.09] text-foreground",
                  "shadow-[0_12px_40px_rgba(220,38,38,0.14)]",
                  "hover:border-red-500/28 hover:bg-red-500/[0.12]",
                  "hover:shadow-[0_16px_48px_rgba(220,38,38,0.18)]",
                ]
              : [
                  "border border-white/25 bg-background/55 text-foreground",
                  "shadow-[0_12px_40px_rgba(15,23,42,0.14)]",
                  "hover:bg-background/70 hover:shadow-[0_16px_48px_rgba(15,23,42,0.18)]",
                ]
          )}
        >
          <span
            className={cn(
              "pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b to-transparent opacity-70",
              isYouTube ? "from-red-100/25" : "from-white/30"
            )}
          />
          {createElement(PrimaryIcon, {
            className: cn(
              "relative size-9 shrink-0",
              isYouTube && "text-red-600/90"
            ),
            strokeWidth: 2.25,
          })}
          <span className="relative">{primary?.label ?? "원본 열기"}</span>
        </button>

        {secondary.length > 0 ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {secondary.map((action) => {
              const Icon = iconForAction(action);
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={isExiting}
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.vibrate) {
                      navigator.vibrate(10);
                    }
                    trackFunnel("now_action", {
                      domain: enriched.domain,
                      enricher_id: enriched.enricher_id,
                    });
                    void runPrimaryAction(action, enriched);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-2.5",
                    "border border-border/60 bg-background/50 text-sm font-medium backdrop-blur-md",
                    "transition-colors hover:bg-secondary/60",
                    "disabled:pointer-events-none disabled:opacity-50"
                  )}
                >
                  {createElement(Icon, {
                    className: "size-4 shrink-0",
                    strokeWidth: 2,
                  })}
                  {action.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          disabled={isExiting}
          onClick={finish}
          className={cn(
            "mt-8 w-full text-sm font-medium text-muted-foreground/90",
            "transition-colors hover:text-foreground",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          그냥 내 링크에 둘게요
        </button>
      </div>
    </motion.div>
  );
}
