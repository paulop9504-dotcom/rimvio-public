"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FeedShareSheet } from "@/components/feed-share-sheet";
import { ScheduleMediumSheet } from "@/components/schedule-medium-sheet";
import { FeedHeroArt } from "@/components/feed-hero-art";
import { FeedCompactAmbient } from "@/components/feed-compact-ambient";
import { FeedCompactVisual } from "@/components/feed-compact-visual";
import { FeedActionAlarm } from "@/components/feed-action-alarm";
import { FeedStoryStack } from "@/components/feed-story-stack";
import { FeedInsightCard } from "@/components/feed-insight-card";
import { useNavSectorPicker } from "@/hooks/use-nav-sector-picker";
import {
  shouldShowMarketPrice,
  useMarketPrice,
} from "@/hooks/use-market-price";
import { useTrueCostReceipt, shouldShowTrueCostReceipt } from "@/hooks/use-true-cost-receipt";
import { shouldShowTimeReceipt, useTimeReceipt } from "@/hooks/use-time-receipt";
import { useStudyReceipt } from "@/hooks/use-study-receipt";
import {
  usePersonalizedFeedActions,
} from "@/hooks/use-personalized-feed-actions";
import { isScheduleAction } from "@/lib/actions/is-schedule-action";
import { runFeedLinkAction } from "@/lib/feed/run-feed-link-action";
import { buildFeedPrimaryRankingWhy } from "@/lib/feed/rank-feed-link-actions";
import { recordFeedLinkActionTelemetry } from "@/lib/archive/record-feed-link-telemetry";
import { buildLinkRankingContextKey } from "@/lib/feed/build-link-ranking-context-key";
import { useCopy, useAppLocale } from "@/hooks/use-copy";
import type { Copy } from "@/lib/i18n/types";
import { shadowAction } from "@/lib/action-shadowing";
import { isPinnedLinkUrl } from "@/lib/local-links/pinned-link";
import { resolveOpenLoopHint, resolveOpenLoopLevel } from "@/lib/behavior/zeigarnik";
import {
  resolveFeedCardInsight,
  resolveFeedCardSecondaries,
  resolveFeedCardSignal,
} from "@/lib/feed/resolve-feed-card-panel";
import { resolveFeedStoryLayout } from "@/lib/feed/resolve-feed-story-layout";
import { FEED_MAX_SECONDARY } from "@/lib/feed/feed-panel-limits";
import { resolveReceiptPeekKind } from "@/lib/feed/resolve-receipt-peek";
import {
  isYouTubeDomain,
  isYouTubeThumbnail,
} from "@/lib/feed/feed-visual";
import {
  cleanFeedActionLabel,
  getFeedCategoryLabel,
} from "@/lib/feed/feed-display";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import {
  locateResultToFeedPanel,
  runLocateFeedAction,
  LOCATE_LOADING_SIGNAL,
} from "@/lib/locate/locate-chip-actions";
import type { LocateActionResult } from "@/lib/locate/types";
import { isScreenshotLink } from "@/lib/share/ingest-screenshot";
import { enrichLinkWithDomainActions } from "@/lib/actions/enrich-link-domain-actions";
import { filterFeedDisplayActions } from "@/lib/feed/feed-action-filter";
import { projectFeedMapActions } from "@/lib/feed/project-feed-map-actions";
import {
  isMapLaunchAction,
  mapPrimaryLabel,
  resolveMapLaunchContext,
} from "@/lib/resolvers/map-app-launch";
import { dropMismatchedOpenActions } from "@/lib/feed/action-title-guard";
import { toDomainFamily } from "@/lib/personalization/action-family";
import { toContextBin } from "@/lib/intent/context-bin";
import { trackReceiptDefer } from "@/lib/personalization/track-user-action";
import { isSampleFeedLink } from "@/lib/onboarding/sample-feed";
import { mergeFeedPanelWithRemote } from "@/lib/feed/merge-context-remote-panel";
import { runRemoteAction } from "@/lib/remote/run-remote-action";
import type { ContextRemoteState } from "@/lib/remote/resolve-context-remote";
import type { LinkActionItem, LinkRow } from "@/types/database";
import type { ScheduleMedium } from "@/lib/preferences/schedule-medium";
import { cn } from "@/lib/utils";
import { FEED_CATEGORY_RAIL_OFFSET } from "@/components/feed-category-pills";
import { normalizeEnricherContext } from "@/lib/enrichers/context";
import { IOS } from "@/lib/ui/ios-surface";

type ActionShortsSlideProps = {
  link: LinkRow;
  index: number;
  total: number;
  peerLinks?: LinkRow[];
  showCategorySpace?: boolean;
  contextRemote?: ContextRemoteState | null;
  onOpenLink?: (link: LinkRow) => void;
  actionIndex: number;
  shareOpen: boolean;
  onShareOpenChange: (open: boolean) => void;
  isActive?: boolean;
  locateResult?: LocateActionResult | null;
  locateLoading?: boolean;
};

async function runAction(
  action: LinkActionItem,
  link: LinkRow,
  copy: Copy,
  scheduleMedium?: ScheduleMedium
) {
  await runFeedLinkAction(action, link, copy, scheduleMedium);
}

function FeedSlideMeta({
  index,
  total,
  isPinned,
  loopLevel,
  loopHint,
  categoryLabel,
  overlay = false,
  isSample = false,
}: {
  index: number;
  total: number;
  isPinned: boolean;
  loopLevel: number;
  loopHint: string | null;
  categoryLabel: string | null;
  overlay?: boolean;
  isSample?: boolean;
}) {
  const pill = overlay
    ? "bg-black/35 text-white ring-1 ring-white/20 backdrop-blur-md"
    : "bg-rimvio-surface-muted text-muted-foreground";

  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={cn(
          "rounded-full px-2.5 py-0.5 text-[10px] font-semibold tabular-nums",
          overlay ? "bg-black/35 text-white/90 backdrop-blur-md" : "text-muted-foreground"
        )}
      >
        {index + 1} / {total}
      </span>
      <div className="flex items-center gap-1.5">
        {isSample ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
              overlay ? "bg-rimvio-surface/20 text-white/90" : "bg-[#eef0f4] text-muted-foreground"
            )}
          >
            ?�시
          </span>
        ) : null}
        {isPinned ? (
          <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", pill, !overlay && "bg-rimvio-neon-purple/10 text-rimvio-neon-cyan")}>
            방금 공유
          </span>
        ) : null}
        {loopLevel >= 2 && loopHint ? (
          <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", overlay ? "bg-[#FF9500]/35 text-white" : "bg-[#FF9500]/10 text-[#FF9500]")}>
            미완�?          </span>
        ) : null}
        {categoryLabel && total > 1 ? (
          <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", pill)}>
            {categoryLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ActionShortsSlide({
  link,
  index,
  total,
  showCategorySpace = false,
  contextRemote = null,
  actionIndex,
  shareOpen,
  onShareOpenChange,
  isActive = false,
  locateResult = null,
  locateLoading = false,
}: ActionShortsSlideProps) {
  const router = useRouter();
  const copy = useCopy();
  const locale = useAppLocale();
  const [schedulePick, setSchedulePick] = useState<{
    action: LinkActionItem;
    label: string;
  } | null>(null);
  const { requestNavSector, shouldOpenNavSector, navSectorSheet } = useNavSectorPicker({
    copy,
    resolveLink: () => link,
  });
  const storyLayout = resolveFeedStoryLayout(link);
  const isCover = storyLayout === "capture-cover";
  const showCompactAmbient = !isCover;
  const showYouTubeCompact =
    showCompactAmbient &&
    Boolean(link.thumbnail_url?.trim()) &&
    isYouTubeDomain(link.domain, link.original_url) &&
    isYouTubeThumbnail(link.thumbnail_url!);

  const actions = useMemo(() => {
    const base =
      link.actions.length > 0
        ? link.actions
        : [
            {
              id: "fallback-open",
              label: copy.actions.openLink,
              kind: "open" as const,
              href: link.original_url,
            },
          ];

    return dropMismatchedOpenActions(
      filterFeedDisplayActions(
        projectFeedMapActions(link, base)
      ),
      link.title
    );
  }, [link.actions, link.original_url, link.title, copy.actions.openLink]);

  const { focused } = usePersonalizedFeedActions(link, actionIndex, isActive);
  const showMarketPrice = shouldShowMarketPrice(link);
  const { snapshot: marketPrice, loading: marketPriceLoading } = useMarketPrice(
    link,
    isActive && showMarketPrice && (isCover || showCompactAmbient)
  );
  const showTrueCost = shouldShowTrueCostReceipt(link);
  const trueCostReceipt = useTrueCostReceipt(
    link,
    isActive && (isCover || showCompactAmbient),
    marketPrice?.listingPrice ?? null
  );
  const showInsightTrueCost = showTrueCost && Boolean(trueCostReceipt?.available);
  const showTimeReceipt = shouldShowTimeReceipt(link);
  const insightKind = resolveFeedCardInsight(link);
  const showInsightStudy = insightKind === "study";
  const { receipt: timeReceipt, loading: timeReceiptLoading } = useTimeReceipt(
    link,
    isActive &&
      showTimeReceipt &&
      (isCover || showCompactAmbient) &&
      !showInsightStudy
  );
  const studyReceipt = useStudyReceipt(
    link,
    isActive && (isCover || showCompactAmbient)
  );
  const showInsightTime = insightKind === "time" && showTimeReceipt;
  const showInsightMarket = insightKind === "market" && showMarketPrice;
  const showInsightTrueCostStacked = showInsightTrueCost;

  const secondary = resolveFeedCardSecondaries(actions, focused);
  const cardSignal = resolveFeedCardSignal(link, focused);
  const cardTitle = getDisplayTitleForLink(link);
  const mergedPanel = mergeFeedPanelWithRemote({
    remote: contextRemote,
    isActive,
    cardSignal,
    focused,
    secondary,
  });
  const panelSignal = mergedPanel.signalLine;
  const panelSecondary = mergedPanel.secondary;

  const mapLaunchContext = useMemo(() => {
    if (!isMapLaunchAction(focused, link)) {
      return null;
    }

    return resolveMapLaunchContext(link, focused);
  }, [focused, link]);

  const dispatchLinkAction = (action: LinkActionItem) => {
    if (isScheduleAction(action)) {
      setSchedulePick({
        action,
        label: cleanFeedActionLabel(action.label, locale),
      });
      return;
    }

    if (isMapLaunchAction(action, link) || shouldOpenNavSector(action)) {
      requestNavSector(action, link, cardTitle ?? undefined);
      return;
    }

    void runAction(action, link, copy);
  };

  const runSecondaryAction = (action: LinkActionItem) => {
    if (mergedPanel.remoteActionIds.has(action.id || action.label)) {
      void runRemoteAction(action, link);
      return;
    }
    dispatchLinkAction(action);
  };
  const isPinned = isPinnedLinkUrl(link.original_url);
  const categoryLabel = getFeedCategoryLabel(link.category);
  const primaryLabel = mapLaunchContext
    ? mapPrimaryLabel(mapLaunchContext)
    : cleanFeedActionLabel(focused.label, locale);

  const rankingWhy = useMemo(
    () =>
      buildFeedPrimaryRankingWhy({
        actions,
        primary: focused,
        link,
      }),
    [actions, focused, link],
  );

  const rankingContextKey = useMemo(
    () =>
      buildLinkRankingContextKey({
        domain: link.domain,
        category: link.category,
      }),
    [link.category, link.domain],
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }
    recordFeedLinkActionTelemetry({
      link,
      action: focused,
      kind: "shown",
      contextKey: rankingContextKey,
      tier: "MAIN",
    });
  }, [focused.id, isActive, link.id, rankingContextKey]);
  const loopHint = resolveOpenLoopHint(link);
  const loopLevel = resolveOpenLoopLevel(link);
  const showLocatePanel =
    index === 0 && isScreenshotLink(link) && (locateLoading || Boolean(locateResult));
  const locatePanel = locateResult ? locateResultToFeedPanel(locateResult) : null;
  const isYouTube = link.domain.includes("youtube");
  const contextBin = toContextBin(
    normalizeEnricherContext({ hour: new Date().getHours() })
  );
  const domainFamily = toDomainFamily(link.domain, link.category);
  const panelVariant = isCover ? "overlay" : "stack";

  const hasAmbientInsight =
    showCompactAmbient &&
    ((showInsightStudy && studyReceipt?.available) ||
      (showInsightTime && timeReceipt?.available) ||
      (showInsightMarket && marketPrice?.available) ||
      showInsightTrueCostStacked);

  const receiptPeekKind = resolveReceiptPeekKind({
    link,
    signalLine: panelSignal,
    hasAmbientInsight,
    timeAvailable: Boolean(timeReceipt?.available),
    marketAvailable: Boolean(marketPrice?.available),
    trueCostAvailable: Boolean(trueCostReceipt?.available),
    studyAvailable: Boolean(studyReceipt?.available),
  });
  const panelPeekKind =
    isCover &&
    ((showInsightStudy && studyReceipt?.available) ||
      showInsightMarket ||
      showInsightTrueCostStacked)
      ? null
      : receiptPeekKind;

  const handleReceiptDefer = (timing: {
    dwell_time_ms: number;
    time_to_action_ms: number;
  }) => {
    trackReceiptDefer({
      link,
      domainFamily,
      contextBin,
      dwell_time_ms: timing.dwell_time_ms,
      time_to_action_ms: timing.time_to_action_ms,
    });
  };

  const handleFocusedAction = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(12);
    }

    shadowAction(focused, {
      router,
      fallbackHref: link.original_url,
      intent: "touch",
    });
    dispatchLinkAction(focused);
  };

  const actionPanel = showLocatePanel ? (
    <FeedActionAlarm
      link={link}
      isActive={isActive}
      peekKind={null}
      variant={panelVariant}
      signalLine={
        locateLoading
          ? LOCATE_LOADING_SIGNAL
          : locatePanel?.signalLine ?? panelSignal
      }
      title={locatePanel?.title ?? cardTitle}
      primaryLabel={locatePanel?.primary.label ?? primaryLabel}
      onPrimary={() => {
        if (locatePanel?.primary) {
          void runLocateFeedAction(locatePanel.primary, link);
          return;
        }
        handleFocusedAction();
      }}
      secondary={(locatePanel?.secondary ?? panelSecondary).slice(
        0,
        FEED_MAX_SECONDARY
      )}
      onSecondary={(action) => {
        if (locatePanel?.secondary?.some((item) => item.id === action.id)) {
          void runLocateFeedAction(action, link);
          return;
        }
        runSecondaryAction(action);
      }}
      locale={locale}
      loading={locateLoading}
      showPrimary={Boolean(locatePanel?.primary ?? true)}
      primaryVariant={isYouTube ? "youtube" : "default"}
      rankingWhy={rankingWhy}
    />
  ) : (
    <FeedActionAlarm
      link={link}
      isActive={isActive}
      peekKind={panelPeekKind}
      peekResetKey={`${link.id}-${actionIndex}`}
      variant={panelVariant}
      signalLine={panelSignal}
      title={cardTitle}
      primaryLabel={primaryLabel}
      onPrimary={handleFocusedAction}
      secondary={panelSecondary}
      onSecondary={runSecondaryAction}
      locale={locale}
      primaryVariant={isYouTube ? "youtube" : "default"}
      rankingWhy={rankingWhy}
      timeReceipt={timeReceipt}
      marketSnapshot={marketPrice}
      trueCostReceipt={trueCostReceipt}
      studyReceipt={studyReceipt}
    />
  );

  const insightBlock =
    isCover &&
    !showLocatePanel &&
    (showInsightMarket || showInsightTrueCostStacked || showInsightTime || showInsightStudy) ? (
      <div className="space-y-2 rounded-2xl bg-black/40 p-2 ring-1 ring-white/15 backdrop-blur-md">
        {showInsightStudy ? (
          <FeedInsightCard
            kind="study"
            link={link}
            overlay
            compact
            studyReceipt={studyReceipt}
          />
        ) : null}
        {showInsightMarket || showInsightTrueCostStacked ? (
          <FeedInsightCard
            kind="commerce"
            link={link}
            overlay
            compact
            marketSnapshot={marketPrice}
            trueCostReceipt={trueCostReceipt}
            marketLoading={marketPriceLoading}
            active={isActive}
            onReceiptDefer={handleReceiptDefer}
          />
        ) : null}
        {showInsightTime ? (
          <FeedInsightCard
            kind="time"
            link={link}
            overlay
            timeReceipt={timeReceipt}
            timeLoading={timeReceiptLoading}
          />
        ) : null}
      </div>
    ) : null;

  return (
    <>
      <section
        className={cn(
          "relative flex h-full min-h-full w-full shrink-0 snap-start snap-always flex-col",
          IOS.bg,
          "px-[var(--space-phi)] pt-[var(--space-u)] pb-[var(--space-u)]",
          showCategorySpace ? FEED_CATEGORY_RAIL_OFFSET : undefined
        )}
      >
        <FeedStoryStack
          layout={storyLayout}
          meta={
            <FeedSlideMeta
              index={index}
              total={total}
              isPinned={isPinned}
              loopLevel={loopLevel}
              loopHint={loopHint}
              categoryLabel={categoryLabel}
              overlay={isCover}
              isSample={isSampleFeedLink(link)}
            />
          }
          ambient={
            showCompactAmbient ? (
              <FeedCompactAmbient
                link={link}
                primaryActionLabel={primaryLabel}
                showStudy={showInsightStudy}
                studyReceipt={studyReceipt}
                showTime={showInsightTime}
                timeReceipt={timeReceipt}
                timeLoading={timeReceiptLoading}
                showMarket={showInsightMarket}
                marketSnapshot={marketPrice}
                marketLoading={marketPriceLoading}
                showTrueCost={showInsightTrueCostStacked}
                trueCostReceipt={trueCostReceipt}
                active={isActive}
                onReceiptDefer={handleReceiptDefer}
              />
            ) : undefined
          }
          visual={
            isCover ? (
              <FeedHeroArt
                link={link}
                layout="cover"
                className="size-full"
              />
            ) : showYouTubeCompact ? (
              <FeedCompactVisual link={link} />
            ) : null
          }
          actions={actionPanel}
          insight={insightBlock}
          className="min-h-0 flex-1"
        />
      </section>

      {navSectorSheet}

      <ScheduleMediumSheet
        open={Boolean(schedulePick)}
        onOpenChange={(open) => {
          if (!open) {
            setSchedulePick(null);
          }
        }}
        actionLabel={schedulePick?.label}
        onSelect={(medium) => {
          if (!schedulePick) {
            return;
          }
          void runAction(schedulePick.action, link, copy, medium);
          setSchedulePick(null);
        }}
      />

      <FeedShareSheet
        link={link}
        open={shareOpen}
        onOpenChange={onShareOpenChange}
      />
    </>
  );
}

export function getLinkActions(link: LinkRow): LinkActionItem[] {
  const base =
    link.actions.length > 0
      ? link.actions
      : ([
          {
            id: "fallback-open",
            label: "?�본 ?�기",
            kind: "open" as const,
            href: link.original_url,
          },
        ] satisfies LinkActionItem[]);

  return dropMismatchedOpenActions(
    filterFeedDisplayActions(
      projectFeedMapActions(link, enrichLinkWithDomainActions(link, base))
    ),
    link.title
  );
}
