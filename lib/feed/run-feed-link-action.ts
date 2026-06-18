import { notifyLinkActionResult } from "@/lib/actions/notify-link-action-result";
import { runLinkActionForLink } from "@/lib/actions/run-link-action-for-link";
import { executeDeepLinkDispatchAction } from "@/lib/deep-link-dispatch/execute-rimvio-action";
import { trackActionClick, analyticsFromLink } from "@/lib/analytics/track-client";
import { upsertContextContainer, touchContextContainer } from "@/lib/containers/context-containers";
import { normalizeEnricherContext } from "@/lib/enrichers/context";
import type { Copy } from "@/lib/i18n/types";
import { toActionFamily, toDomainFamily } from "@/lib/personalization/action-family";
import { recordLocalPersonalizationClick } from "@/lib/personalization/client-store";
import { trackPersonalizationClick } from "@/hooks/use-personalized-feed-actions";
import { toContextBin } from "@/lib/intent/context-bin";
import {
  foldFeedLinkLearning,
  recordFeedLinkActionTelemetry,
} from "@/lib/archive/record-feed-link-telemetry";
import { buildCommerceAwareRankingContextKey } from "@/lib/feed/build-commerce-aware-ranking-context-key";
import { markFirstActionSuccess } from "@/lib/platform/pwa-install-nudge";
import { recordActionTrustSuccess } from "@/lib/preferences/action-trust";
import type { SurfaceLinkTelemetrySurface } from "@/lib/archive/record-surface-link-telemetry";
import type { LinkActionItem, LinkRow } from "@/types/database";
import { toast } from "sonner";

export async function runFeedLinkAction(
  action: LinkActionItem,
  link: LinkRow,
  copy: Copy,
  scheduleMedium?: ScheduleMedium,
  options?: { surface?: SurfaceLinkTelemetrySurface },
) {
  if (action.payload?.transportLiveRefresh === true) {
    window.dispatchEvent(
      new CustomEvent("rimvio:transport-live-refresh", {
        detail: {
          stopId: action.payload.stopId,
          routeId: action.payload.routeId,
          location: action.payload.location,
        },
      })
    );
    return;
  }

  if (action.href?.startsWith("rimvio://container/")) {
    const title =
      typeof action.payload?.containerTitle === "string"
        ? action.payload.containerTitle
        : decodeURIComponent(action.href.replace("rimvio://container/", ""));
    upsertContextContainer({ title });
    touchContextContainer(title);
    toast.success(`「${title}」 컨테이너에 저장했어요`);
    recordActionTrustSuccess();
    return;
  }

  if (action.payload?.deepLinkDispatch === true) {
    executeDeepLinkDispatchAction(action);
    recordActionTrustSuccess();
    markFirstActionSuccess();
    window.dispatchEvent(new CustomEvent("rimvio:first-action"));
    return;
  }

  const actionFamily = toActionFamily(action);
  const domainFamily = toDomainFamily(link.domain, link.category);
  const rankingContextKey = buildCommerceAwareRankingContextKey({
    link,
    action,
  });
  const contextBin = toContextBin(
    normalizeEnricherContext({ hour: new Date().getHours() })
  );

  const telemetrySurface = options?.surface ?? "feed";

  recordFeedLinkActionTelemetry({
    link,
    action,
    kind: "clicked",
    contextKey: rankingContextKey,
    tier: "MAIN",
    surface: telemetrySurface,
  });

  recordLocalPersonalizationClick({
    linkId: link.id,
    actionId: action.id,
    actionFamily,
    domainFamily,
    linkCategory: link.category,
    contextBin,
  });

  trackPersonalizationClick({ link, action, actionFamily, contextBin });

  const result = await runLinkActionForLink(action, link, { scheduleMedium });
  trackActionClick({
    ...analyticsFromLink(link, "feed"),
    action,
    copySucceeded: Boolean(result.copiedText || result.sharedText),
  });

  markFirstActionSuccess();
  recordActionTrustSuccess();
  window.dispatchEvent(new CustomEvent("rimvio:first-action"));

  recordFeedLinkActionTelemetry({
    link,
    action,
    kind: "executed",
    contextKey: rankingContextKey,
    tier: "MAIN",
    surface: telemetrySurface,
  });
  foldFeedLinkLearning({ linkId: link.id, contextKey: rankingContextKey });

  notifyLinkActionResult(result, action, copy);
}
