"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionOfferBlock, estimateOfferConfidenceFromLink } from "@/components/action-chat/action-offer-block";
import { ActionChatReceiptRail } from "@/components/action-chat/receipt-rail";
import { ScheduleMediumSheet } from "@/components/schedule-medium-sheet";
import { useNavSectorPicker } from "@/hooks/use-nav-sector-picker";
import { usePersonalizedFeedActions } from "@/hooks/use-personalized-feed-actions";
import { useActionChatReceipts } from "@/hooks/use-action-chat-receipts";
import { useCopy, useAppLocale } from "@/hooks/use-copy";
import { isScheduleAction } from "@/lib/actions/is-schedule-action";
import { cleanFeedActionLabel } from "@/lib/feed/feed-display";
import { mergeFeedPanelWithRemote } from "@/lib/feed/merge-context-remote-panel";
import { runFeedLinkAction } from "@/lib/feed/run-feed-link-action";
import {
  resolveFeedCardSecondaries,
  resolveFeedCardSignal,
} from "@/lib/feed/resolve-feed-card-panel";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
import {
  locateResultToFeedPanel,
  runLocateFeedAction,
  LOCATE_LOADING_SIGNAL,
} from "@/lib/locate/locate-chip-actions";
import type { LocateActionResult } from "@/lib/locate/types";
import { isScreenshotLink } from "@/lib/share/ingest-screenshot";
import { FEED_MAX_SECONDARY } from "@/lib/feed/feed-panel-limits";
import {
  isMapLaunchAction,
  mapPrimaryLabel,
  resolveMapLaunchContext,
} from "@/lib/resolvers/map-app-launch";
import { runRemoteAction } from "@/lib/remote/run-remote-action";
import type { ContextRemoteState } from "@/lib/remote/resolve-context-remote";
import { shadowAction } from "@/lib/action-shadowing";
import type { LinkActionItem, LinkRow } from "@/types/database";
import type { ScheduleMedium } from "@/lib/preferences/schedule-medium";
import { getLinkActions } from "@/components/action-shorts-slide";

type ActionChatLinkPanelProps = {
  link: LinkRow;
  isActive?: boolean;
  contextRemote?: ContextRemoteState | null;
  locateResult?: LocateActionResult | null;
  locateLoading?: boolean;
  actionIndex?: number;
};

export function ActionChatLinkPanel({
  link,
  isActive = true,
  contextRemote = null,
  locateResult = null,
  locateLoading = false,
  actionIndex = 0,
}: ActionChatLinkPanelProps) {
  const copy = useCopy();
  const locale = useAppLocale();
  const router = useRouter();
  const { requestNavSector, shouldOpenNavSector, navSectorSheet } = useNavSectorPicker({
    copy,
    resolveLink: () => link,
  });
  const [schedulePick, setSchedulePick] = useState<{
    action: LinkActionItem;
    label: string;
  } | null>(null);

  const actions = useMemo(() => getLinkActions(link), [link]);
  const { focused } = usePersonalizedFeedActions(link, actionIndex, isActive);
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

  const primaryLabel = mapLaunchContext
    ? mapPrimaryLabel(mapLaunchContext)
    : cleanFeedActionLabel(focused.label, locale);

  const showLocatePanel =
    isScreenshotLink(link) && (locateLoading || Boolean(locateResult));
  const locatePanel = locateResult ? locateResultToFeedPanel(locateResult) : null;

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

    void runFeedLinkAction(action, link, copy);
  };

  const runSecondaryAction = (action: LinkActionItem) => {
    if (mergedPanel.remoteActionIds.has(action.id || action.label)) {
      void runRemoteAction(action, link);
      return;
    }
    dispatchLinkAction(action);
  };

  const displaySignal = showLocatePanel
    ? locateLoading
      ? LOCATE_LOADING_SIGNAL
      : locatePanel?.signalLine ?? panelSignal
    : panelSignal;

  const displayPrimary = locatePanel?.primary ?? focused;
  const displayPrimaryLabel = locatePanel?.primary
    ? cleanFeedActionLabel(locatePanel.primary.label, locale)
    : primaryLabel;
  const displaySecondary = (locatePanel?.secondary ?? panelSecondary).slice(
    0,
    FEED_MAX_SECONDARY
  );

  const summaryText =
    displaySignal?.replace(/^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+/u, "").trim() ||
    `${cardTitle} 정보를 찾았어요!`;

  const offerConfidence = useMemo(
    () =>
      estimateOfferConfidenceFromLink({
        link,
        locateLoading,
        hasLocateResult: Boolean(locateResult),
        primary: displayPrimary,
      }),
    [displayPrimary, link, locateLoading, locateResult]
  );

  const thumb = link.thumbnail_url?.trim();
  const isCapture = isScreenshotLink(link);

  const { items: receiptItems, loading: receiptsLoading } = useActionChatReceipts({
    link,
    enabled: isActive && !locateLoading,
    signalLine: displaySignal,
    primaryActionLabel: displayPrimaryLabel,
  });

  return (
    <>
      <div className="space-y-5 px-4 pb-4">
        {(isCapture && thumb) || link.original_url ? (
          <div className="flex justify-end">
            <div className="max-w-[min(68%,17rem)] space-y-2">
              {isCapture && thumb ? (
                <div className="overflow-hidden rounded-[16px] rounded-br-[4px] border border-border bg-rimvio-surface shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt="" className="max-h-44 w-full object-cover" />
                </div>
              ) : null}
              {!isCapture || link.original_url.includes("http") ? (
                <div className="chat-bubble chat-bubble--user chat-bubble--user-single text-[14px]">
                  {link.original_url.replace(/^https?:\/\//, "").slice(0, 64)}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <ActionOfferBlock
              summaryText={summaryText}
              cardTitle={cardTitle ?? ""}
              primary={displayPrimary}
              primaryLabel={displayPrimaryLabel}
              secondary={displaySecondary}
              locale={locale}
              loading={locateLoading}
              confidence={offerConfidence}
              receiptRail={
                <ActionChatReceiptRail
                  items={receiptItems}
                  loading={receiptsLoading}
                />
              }
              onPrimary={(action) => {
                if (locatePanel?.primary && action.id === locatePanel.primary.id) {
                  void runLocateFeedAction(locatePanel.primary, link);
                  return;
                }
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(12);
                }
                shadowAction(action, {
                  router,
                  fallbackHref: link.original_url,
                  intent: "touch",
                });
                dispatchLinkAction(action);
              }}
              onAction={(action) => {
                if (locatePanel?.secondary?.some((item) => item.id === action.id)) {
                  void runLocateFeedAction(action, link);
                  return;
                }
                runSecondaryAction(action);
            }}
        />
      </div>

      {navSectorSheet}

      <ScheduleMediumSheet
        open={Boolean(schedulePick)}
        onOpenChange={(open) => {
          if (!open) {
            setSchedulePick(null);
          }
        }}
        actionLabel={schedulePick?.label}
        onSelect={(medium: ScheduleMedium) => {
          if (!schedulePick) {
            return;
          }
          void runFeedLinkAction(schedulePick.action, link, copy, medium);
          setSchedulePick(null);
        }}
      />
    </>
  );
}
