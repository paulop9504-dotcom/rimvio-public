"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  Copy,
  ExternalLink,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ConfirmRevealButtons } from "@/components/action-chat/magic-action-ui";
import {
  resolveLinkMainOffer,
  shouldShowLinkMainHero,
} from "@/lib/action-chat/resolve-link-main-offer";
import {
  recordSurfaceLinkActionTelemetry,
} from "@/lib/archive/record-surface-link-telemetry";
import { runFeedLinkAction } from "@/lib/feed/run-feed-link-action";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { HorizontalScrollRail } from "@/components/horizontal-scroll-rail";
import { useCopy } from "@/hooks/use-copy";
import {
  shadowAction,
  shadowPrimaryLink,
  triggerActionHaptic,
} from "@/lib/action-shadowing";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import type { LinkActionItem, LinkRow } from "@/types/database";
import {
  getDomainGradient,
  getDomainInitial,
} from "@/lib/utils/domain-gradient";
import { cn } from "@/lib/utils";

type ActionCardProps = {
  link: LinkRow;
  index?: number;
};

const actionIcons: Record<LinkActionItem["kind"], LucideIcon> = {
  open: ExternalLink,
  save: Bookmark,
  share: Share2,
  remind: Bell,
  copy: Copy,
  custom: Sparkles,
};

function LinkThumbnail({ link }: { link: LinkRow }) {
  const gradient = getDomainGradient(link.domain);
  const initial = getDomainInitial(link.domain);

  if (link.thumbnail_url) {
    return (
      <div className="relative size-[72px] shrink-0 overflow-hidden rounded-2xl shadow-sm">
        <Image
          src={link.thumbnail_url}
          alt=""
          fill
          className="object-cover"
          sizes="72px"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br shadow-sm",
        gradient
      )}
    >
      <span className="text-2xl font-semibold tracking-tight text-white/95">
        {initial}
      </span>
      <div className="pointer-events-none absolute inset-0 bg-rimvio-surface/10" />
    </div>
  );
}

function ActionBridgeButton({
  action,
  link,
  onShadow,
  onRun,
}: {
  action: LinkActionItem;
  link: LinkRow;
  onShadow: (action: LinkActionItem, intent: "hover" | "touch") => void;
  onRun: (action: LinkActionItem) => void;
}) {
  const Icon = actionIcons[action.kind];

  const handleShadowHover = () => {
    onShadow(action, "hover");
  };

  const handleShadowTouch = () => {
    onShadow(action, "touch");
  };

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onRun(action);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleShadowHover}
      onTouchStart={handleShadowTouch}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full",
        "bg-secondary/70 px-4 text-sm font-medium text-secondary-foreground",
        "transition-[transform,background-color] duration-200",
        "active:scale-[0.97] active:bg-secondary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={2} />
      <span>{action.label}</span>
    </button>
  );
}

export function ActionCard({ link, index = 0 }: ActionCardProps) {
  const router = useRouter();
  const copy = useCopy();
  const [actionsRevealed, setActionsRevealed] = useState(false);
  const shownRef = useRef(false);

  const offer = useMemo(
    () =>
      resolveLinkMainOffer({
        link,
        surface: "stack",
        actionsRevealed,
      }),
    [actionsRevealed, link],
  );

  const primary = offer.primary;
  const showHero = shouldShowLinkMainHero({
    offer,
    actionsRevealed: offer.urgencyBypass || actionsRevealed,
  });
  const showConfirm =
    !offer.urgencyBypass &&
    offer.ux.showConfirmPrompt &&
    Boolean(primary) &&
    !actionsRevealed;

  const displayTitle = getDisplayTitleForLink(link);
  const primaryHref = primary?.href ?? link.original_url;
  const railActions = showHero
    ? [primary, ...offer.secondary].filter(Boolean) as LinkActionItem[]
    : [];

  useEffect(() => {
    if (offer.urgencyBypass) {
      setActionsRevealed(true);
    }
  }, [offer.urgencyBypass]);

  useEffect(() => {
    if (!primary || offer.tier === "low" || offer.tier === "none" || shownRef.current) {
      return;
    }
    shownRef.current = true;
    recordSurfaceLinkActionTelemetry({
      link,
      action: primary,
      kind: "shown",
      surface: "stack",
    });
  }, [link, offer.tier, primary]);

  const runStackAction = async (action: LinkActionItem) => {
    await runFeedLinkAction(action, link, copy, undefined, { surface: "stack" });
  };

  const shadowLinkAction = (
    action: LinkActionItem,
    intent: "hover" | "touch"
  ) => {
    shadowAction(action, {
      router,
      fallbackHref: link.original_url,
      intent,
    });
  };

  const shadowPrimaryHover = () => {
    shadowPrimaryLink(primaryHref, router, "hover");
  };

  const shadowPrimaryTouch = () => {
    shadowPrimaryLink(primaryHref, router, "touch");
  };

  const openPrimary = async () => {
    if (!showHero) {
      if (showConfirm) {
        setActionsRevealed(true);
      }
      return;
    }

    const action = primary;
    if (action) {
      await runStackAction(action);
      return;
    }

    if (primaryHref.startsWith("/")) {
      triggerActionHaptic();
      router.push(primaryHref);
      return;
    }

    triggerActionHaptic();
    window.location.assign(primaryHref);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Card
        className={cn(
          "gap-0 overflow-hidden rounded-3xl border-0 bg-card shadow-sm",
          "transition-[transform,box-shadow] duration-200",
          "hover:shadow-md active:scale-[0.985] active:shadow-sm"
        )}
      >
        <CardContent className="p-4 pb-3">
          <button
            type="button"
            onClick={openPrimary}
            onMouseEnter={shadowPrimaryHover}
            onTouchStart={shadowPrimaryTouch}
            className={cn(
              "flex w-full items-start gap-3.5 text-left",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            )}
          >
            <div className="relative shrink-0">
              <LinkThumbnail link={link} />
              {link.category ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "absolute -right-1 -top-1 border-0 px-2 py-0.5",
                    "bg-background/90 text-[10px] font-medium shadow-sm backdrop-blur-md"
                  )}
                >
                  {link.category}
                </Badge>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                {displayTitle ? (
                  <h2 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-foreground">
                    {displayTitle}
                  </h2>
                ) : null}
                <ArrowUpRight
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground/60",
                    displayTitle ? "mt-0.5" : "mt-0"
                  )}
                  strokeWidth={2}
                />
              </div>
              <p className={cn("truncate text-sm text-muted-foreground", displayTitle && "mt-1")}>
                {link.domain}
              </p>
              {offer.promptSummary && !showHero ? (
                <p className="mt-2 text-xs text-muted-foreground">{offer.promptSummary}</p>
              ) : null}
            </div>
          </button>

          {showConfirm ? (
            <ConfirmRevealButtons
              onConfirm={() => setActionsRevealed(true)}
              className="mt-3 px-0"
            />
          ) : null}
        </CardContent>

        {railActions.length > 0 ? (
          <CardFooter className="border-0 px-4 pb-4 pt-0">
            <HorizontalScrollRail
              className="-mx-1 px-1"
              fadeFrom="var(--card)"
              hintLabel="더 보기"
              scrollClassName="gap-2 pb-0.5"
            >
              {railActions.map((action) => (
                <ActionBridgeButton
                  key={action.id}
                  action={action}
                  link={link}
                  onShadow={shadowLinkAction}
                  onRun={(row) => void runStackAction(row)}
                />
              ))}
            </HorizontalScrollRail>
          </CardFooter>
        ) : null}
      </Card>
    </motion.div>
  );
}
