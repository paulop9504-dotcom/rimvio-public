"use client";

import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { GlobeContextGardenSummary } from "@/components/globe/globe-context-garden-summary";
import { GlobePlacePrefillCard } from "@/components/globe/globe-place-prefill-card";
import { GlobePrepChecklistCard } from "@/components/globe/globe-prep-checklist-card";
import { GlobeHubResourceCarousel } from "@/components/globe/globe-hub-resource-carousel";
import { GlobeLodgingMapStrip } from "@/components/globe/globe-lodging-map-strip";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { enableLodgingHubForContext } from "@/lib/globe/context-hub/enable-lodging-hub-for-context";
import {
  dispatchGlobeLodgingFocus,
  subscribeGlobeLodgingFocus,
} from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import { subscribeGlobeMapMediaFocus } from "@/lib/globe/globe-map-media-focus-bridge";
import { GlobeContextTicketConnectSheet } from "@/components/globe/globe-context-ticket-connect-sheet";
import { GlobeTicketQrViewer } from "@/components/globe/globe-ticket-qr-viewer";
import { connectDepartureHubToContext } from "@/lib/globe/connect-departure-hub-to-context";
import { extractHubRunnableAction } from "@/lib/globe/context-hub/extract-hub-runnable-action";
import {
  foldContextHubLearning,
  recordContextHubTelemetry,
} from "@/lib/globe/context-hub/record-context-hub-telemetry";
import {
  listContextHubServicesForEvent,
  type ContextHubServiceId,
} from "@/lib/globe/context-hub/context-hub-service-catalog";
import { readContextGardenSnapshot } from "@/lib/globe/context-gardener/read-context-garden";
import { rankContextHubServices } from "@/lib/globe/context-hub/rank-context-hub-services";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import { rankContextResources } from "@/lib/globe/resource/rank-context-resources";
import { recordPlaceHubLearning } from "@/lib/globe/place-history/record-place-hub-learning";
import {
  applyWeatherRankMutation,
  buildWeatherPrepLine,
} from "@/lib/globe/weather/apply-weather-rank-mutation";
import { useRouter } from "next/navigation";
import type { DepartureHubAirportId } from "@/lib/globe/departure-hub-airports";
import {
  resolvePinScopeFromEventId,
  writeGlobeOrchestratorScopeHint,
} from "@/lib/globe/globe-orchestrator-scope-bridge";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import { HubServiceSlot } from "@/components/globe/globe-context-hub-service-slot";
import { emitTransactionConvertedTelemetry } from "@/hooks/use-hub-resource-curation-telemetry";
import { useActiveContextWeather } from "@/hooks/use-active-context-weather";
import { useContextGardenOrganizer } from "@/hooks/use-context-garden-organizer";
import { useExecutionProfileStamp } from "@/hooks/use-execution-profile-stamp";
import { useHubResourceSyncWorker } from "@/hooks/use-hub-resource-sync-worker";
import { useMainNativeSurfaceSync } from "@/hooks/use-main-native-surface-sync";
import { isTicketQrViewerHref } from "@/lib/globe/ticket-scan-surface";

export type GlobeContextHubRailProps = {
  /** Active context — hub inventory for this event only. */
  activeEventId?: string | null;
  lat?: number | null;
  lng?: number | null;
  authUserId?: string | null;
  layout?: "dock" | "hero";
  /** dock = left rail; detail = full-screen Hub sheet from map anchor. */
  presentation?: "dock" | "detail";
  defaultExpanded?: boolean;
  onDismiss?: () => void;
  visible?: boolean;
  /** compact = slim vertical dock chip; default = standard rail width. */
  variant?: "default" | "compact";
  className?: string;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
};

const PANEL_WIDTH = "w-[min(calc(100vw-1.5rem),17.5rem)]";
const COMPACT_PANEL_WIDTH = "w-[min(calc(100vw-1.5rem),12rem)]";

function openExternalHref(href: string) {
  if (href.startsWith("/")) {
    window.location.assign(href);
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

export function GlobeContextHubRail({
  activeEventId,
  lat = null,
  lng = null,
  authUserId = null,
  layout = "dock",
  presentation = "dock",
  defaultExpanded = false,
  onDismiss,
  visible = true,
  variant = "default",
  className,
  globeRef,
}: GlobeContextHubRailProps) {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [connectServiceId, setConnectServiceId] = useState<ContextHubServiceId | null>(
    null,
  );
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [ticketConnectOpen, setTicketConnectOpen] = useState(false);
  const [qrViewer, setQrViewer] = useState<{
    src: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [mapMediaFocusOpen, setMapMediaFocusOpen] = useState(false);

  useEffect(() => {
    return subscribeGlobeMapMediaFocus((detail) => {
      setMapMediaFocusOpen(detail.open);
    });
  }, []);

  useEffect(() => {
    setExpanded(defaultExpanded);
    setCarouselIndex(0);
    setConnectServiceId(null);
    setTicketConnectOpen(false);
    setQrViewer(null);
  }, [activeEventId, defaultExpanded]);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    };
  }, []);

  const panel = useMemo(() => {
    void revision;
    const eventId = activeEventId?.trim();
    if (!eventId) {
      return null;
    }
    const event = findLifeEventCandidate(eventId);
    return listContextHubServicesForEvent(event);
  }, [activeEventId, revision]);

  const activeEvent = useMemo(() => {
    void revision;
    const eventId = activeEventId?.trim();
    return eventId ? findLifeEventCandidate(eventId) : null;
  }, [activeEventId, revision]);

  const { tempC } = useActiveContextWeather({
    event: activeEvent,
    enabled: visible && Boolean(activeEvent),
  });

  const weatherPrepLine = useMemo(
    () => buildWeatherPrepLine(tempC),
    [tempC],
  );

  const rankedResources = useMemo((): RankedContextResource[] => {
    void revision;
    if (!panel || !activeEvent) {
      return [];
    }
    const base = rankContextResources({
      event: activeEvent,
      services: panel.services,
      lat,
      lng,
    });
    return applyWeatherRankMutation({
      event: activeEvent,
      ranked: base,
      tempC,
    });
  }, [activeEvent, lat, lng, panel, revision, tempC]);

  useHubResourceSyncWorker({
    activeEventId,
    ranked: rankedResources,
    lat,
    lng,
    enabled: visible && rankedResources.length > 0,
  });

  useMainNativeSurfaceSync({
    activeEventId,
    ranked: rankedResources,
    lat,
    lng,
    authUserId,
    enabled: visible && rankedResources.length > 0,
  });

  useContextGardenOrganizer({
    activeEventId,
    ranked: rankedResources,
    lat,
    lng,
    enabled: visible && rankedResources.length > 0,
  });

  useExecutionProfileStamp({
    activeEventId,
    contextPlace: panel?.contextPlace ?? null,
    enabled: visible && Boolean(activeEventId),
  });

  const gardenSummary = useMemo(() => {
    void revision;
    const eventId = activeEventId?.trim();
    if (!eventId) {
      return null;
    }
    const event = findLifeEventCandidate(eventId);
    return readContextGardenSnapshot(event)?.summary ?? null;
  }, [activeEventId, revision, rankedResources.length]);

  const browseRows = useMemo(
    () => (panel ? rankContextHubServices(panel.services) : []),
    [panel],
  );

  const handleOpenAction = useCallback(
    (url: string, label: string) => {
      const eventId = activeEventId?.trim();
      const event = eventId ? findLifeEventCandidate(eventId) : null;
      if (event) {
        recordContextHubTelemetry({ event, kind: "clicked", label });
        recordContextHubTelemetry({ event, kind: "executed", label });
        foldContextHubLearning(event);
      }
      openExternalHref(url);
    },
    [activeEventId],
  );

  const openTicketQrViewer = useCallback(
    (href: string, label: string) => {
      const eventId = activeEventId?.trim();
      const event = eventId ? findLifeEventCandidate(eventId) : null;
      if (event) {
        recordContextHubTelemetry({ event, kind: "clicked", label });
        recordContextHubTelemetry({ event, kind: "executed", label });
        foldContextHubLearning(event);
      }
      setQrViewer({
        src: href,
        title: label,
        subtitle: panel?.contextPlace ?? undefined,
      });
    },
    [activeEventId, panel?.contextPlace],
  );

  const handleOpenHandoff = useCallback(
    (href: string, label: string, internalRoute = false) => {
      const eventId = activeEventId?.trim();
      const event = eventId ? findLifeEventCandidate(eventId) : null;
      if (event) {
        if (internalRoute) {
          writeGlobeOrchestratorScopeHint({
            pinScope: resolvePinScopeFromEventId(eventId) ?? "internal",
            eventId,
            title: event.title,
          });
        }
        recordContextHubTelemetry({ event, kind: "clicked", label });
        recordContextHubTelemetry({ event, kind: "executed", label });
        foldContextHubLearning(event);
      }
      if (internalRoute) {
        router.push(href);
        return;
      }
      if (isTicketQrViewerHref(href)) {
        openTicketQrViewer(href, label);
        return;
      }
      openExternalHref(href);
    },
    [activeEventId, openTicketQrViewer, router],
  );

  const runCarouselEntry = useCallback(
    (entry: RankedContextResource) => {
      if (entry.resource.action?.kind === "show_qr") {
        openTicketQrViewer(entry.resource.action.href, entry.resource.action.labelKo);
        return;
      }
      const runnable = extractHubRunnableAction(entry.hubRow);
      if (runnable) {
        handleOpenHandoff(runnable.href, runnable.label, runnable.internalRoute);
        return;
      }
      if (entry.hubRow.serviceId === "ticket") {
        setTicketConnectOpen(true);
        return;
      }
      setExpanded(true);
      setConnectServiceId(entry.hubRow.serviceId);
    },
    [handleOpenHandoff, openTicketQrViewer],
  );

  useEffect(() => {
    void revision;
    const eventId = activeEventId?.trim();
    const entry = rankedResources[carouselIndex] ?? rankedResources[0];
    if (!eventId || !entry) {
      return;
    }
    const event = findLifeEventCandidate(eventId);
    if (!event) {
      return;
    }
    recordContextHubTelemetry({
      event,
      kind: "shown",
      label: entry.resource.label,
    });
  }, [activeEventId, carouselIndex, rankedResources, revision]);

  const handleConnectFlight = useCallback(
    async (airportId: DepartureHubAirportId) => {
      const eventId = activeEventId?.trim();
      if (!eventId || busy) {
        return;
      }
      const event = findLifeEventCandidate(eventId);
      setBusy(true);
      try {
        connectDepartureHubToContext({
          destinationEventId: eventId,
          airportId,
        });
        if (event) {
          recordContextHubTelemetry({ event, kind: "clicked", label: airportId });
          foldContextHubLearning(event);
        }
        const label =
          panel?.services
            .find((row) => row.serviceId === "flight")
            ?.flightOptions.find((row) => row.id === airportId)?.shortLabelKo ?? airportId;
        toast.success(copy.globe.departureHubConnected(label));
        setConnectServiceId(null);
        setRevision((value) => value + 1);
        const flightEntry =
          rankedResources.find((row) => row.hubRow.serviceId === "flight") ?? null;
        emitTransactionConvertedTelemetry({
          contextId: eventId,
          resourceId: `${eventId}:flight`,
          sourceHubId: "flight",
          lat,
          lng,
          authUserId,
          entry: flightEntry,
          transactionKind: "connect",
        });
      } catch (caught) {
        toast.error(
          caught instanceof Error
            ? caught.message
            : copy.globe.departureHubConnectFail,
        );
      } finally {
        setBusy(false);
      }
    },
    [activeEventId, authUserId, busy, lat, lng, panel?.services, rankedResources],
  );

  const hasLodgingResources = rankedResources.some(
    (entry) => entry.resource.kind === "lodging_voucher",
  );

  const flyToLodgingAtIndex = useCallback(
    (index: number) => {
      const entry = rankedResources[index];
      if (!entry || entry.resource.kind !== "lodging_voucher") {
        return;
      }
      const rLat = entry.resource.spacetime.lat;
      const rLng = entry.resource.spacetime.lng;
      if (rLat == null || rLng == null) {
        return;
      }
      globeRef?.current?.flyToPin(rLat, rLng, "neighborhood");
    },
    [globeRef, rankedResources],
  );

  const syncLodgingFocus = useCallback(
    (index: number) => {
      const entry = rankedResources[index];
      if (!entry || entry.resource.kind !== "lodging_voucher") {
        return;
      }
      dispatchGlobeLodgingFocus({
        resourceId: entry.resource.resourceId,
        carouselIndex: index,
        source: "carousel",
      });
    },
    [rankedResources],
  );

  const handleCarouselIndexChange = useCallback(
    (index: number) => {
      setCarouselIndex(index);
      flyToLodgingAtIndex(index);
      syncLodgingFocus(index);
    },
    [flyToLodgingAtIndex, syncLodgingFocus],
  );

  useEffect(() => {
    return subscribeGlobeLodgingFocus((detail) => {
      setCarouselIndex((current) => {
        if (current === detail.carouselIndex) {
          return current;
        }
        flyToLodgingAtIndex(detail.carouselIndex);
        return detail.carouselIndex;
      });
    });
  }, [flyToLodgingAtIndex]);

  useEffect(() => {
    if (!hasLodgingResources) {
      return;
    }
    flyToLodgingAtIndex(carouselIndex);
    syncLodgingFocus(carouselIndex);
  }, [
    carouselIndex,
    flyToLodgingAtIndex,
    hasLodgingResources,
    rankedResources,
    syncLodgingFocus,
  ]);

  const handleConnectLodging = useCallback(async () => {
    const eventId = activeEventId?.trim();
    if (!eventId || busy) {
      return;
    }
    const event = findLifeEventCandidate(eventId);
    setBusy(true);
    try {
      await enableLodgingHubForContext({
        contextEventId: eventId,
        lat,
        lng,
      });
      const refreshed = findLifeEventCandidate(eventId);
      if (refreshed) {
        recordContextHubTelemetry({ event: refreshed, kind: "executed", label: "lodging" });
        recordPlaceHubLearning({ event: refreshed, hubId: "lodging", kind: "executed" });
        foldContextHubLearning(refreshed);
      } else if (event) {
        recordContextHubTelemetry({ event, kind: "clicked", label: "lodging" });
        foldContextHubLearning(event);
      }
      toast.success(copy.globe.lodgingHubConnected);
      setRevision((value) => value + 1);
      emitTransactionConvertedTelemetry({
        contextId: eventId,
        resourceId: `${eventId}:lodging`,
        sourceHubId: "lodging",
        lat,
        lng,
        authUserId,
        entry: null,
        transactionKind: "connect",
      });
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.lodgingHubConnectFail,
      );
    } finally {
      setBusy(false);
    }
  }, [activeEventId, authUserId, busy, lat, lng]);

  if (!visible || !panel) {
    return null;
  }

  const showCarousel = rankedResources.length > 0;
  if (presentation === "dock" && !showCarousel) {
    return null;
  }

  const ticketSheets = (
    <>
      <GlobeContextTicketConnectSheet
        open={ticketConnectOpen}
        onOpenChange={setTicketConnectOpen}
        contextEventId={activeEventId ?? null}
        onSaved={() => {
          const eventId = activeEventId?.trim();
          if (!eventId) {
            return;
          }
          setRevision((value) => value + 1);
          const ticketEntry =
            rankedResources.find((row) => row.hubRow.serviceId === "ticket") ?? null;
          emitTransactionConvertedTelemetry({
            contextId: eventId,
            resourceId: `${eventId}:ticket`,
            sourceHubId: "ticket",
            lat,
            lng,
            authUserId,
            entry: ticketEntry,
            transactionKind: "connect",
          });
        }}
      />
      <GlobeTicketQrViewer
        open={Boolean(qrViewer)}
        onOpenChange={(open) => {
          if (!open) {
            setQrViewer(null);
          }
        }}
        qrSrc={qrViewer?.src ?? null}
        title={qrViewer?.title ?? null}
        subtitle={qrViewer?.subtitle ?? null}
      />
    </>
  );

  if (!expanded && presentation === "dock" && showCarousel) {
    return (
      <>
        {ticketSheets}
        <div className={cn("flex flex-col gap-1.5", className)}>
          {variant === "default" ? (
            <>
              <GlobePlacePrefillCard activeEventId={activeEventId} lat={lat} lng={lng} />
              <GlobePrepChecklistCard activeEventId={activeEventId} />
              <GlobeContextGardenSummary summary={gardenSummary} />
              {weatherPrepLine ? (
                <p className="px-0.5 text-[11px] font-medium text-muted-foreground">
                  {weatherPrepLine}
                </p>
              ) : null}
            </>
          ) : null}
          <GlobeHubResourceCarousel
            ranked={rankedResources}
            index={Math.min(carouselIndex, rankedResources.length - 1)}
            onIndexChange={handleCarouselIndexChange}
            onRunRow={runCarouselEntry}
            onExpand={() => setExpanded(true)}
            onDismiss={onDismiss}
            busy={busy}
            contextPlace={panel.contextPlace}
            layout={layout}
            variant={variant}
            contextId={activeEventId}
            lat={lat}
            lng={lng}
            authUserId={authUserId}
          />
          {hasLodgingResources && !mapMediaFocusOpen && variant === "default" ? (
            <GlobeLodgingMapStrip
              ranked={rankedResources}
              activeIndex={Math.min(carouselIndex, rankedResources.length - 1)}
              onSelectIndex={handleCarouselIndexChange}
            />
          ) : null}
        </div>
      </>
    );
  }

  return (
    <>
      {ticketSheets}
      <div className={cn("flex flex-col gap-3", className)}>
        <GlobePlacePrefillCard activeEventId={activeEventId} lat={lat} lng={lng} />
        <GlobePrepChecklistCard activeEventId={activeEventId} />
        <GlobeContextGardenSummary summary={gardenSummary} />
        {weatherPrepLine ? (
          <p className="px-0.5 text-[11px] font-medium text-muted-foreground">{weatherPrepLine}</p>
        ) : null}
        {showCarousel ? (
          <GlobeHubResourceCarousel
            ranked={rankedResources}
            index={Math.min(carouselIndex, rankedResources.length - 1)}
            onIndexChange={handleCarouselIndexChange}
            onRunRow={runCarouselEntry}
            onExpand={() => setExpanded(true)}
            onDismiss={onDismiss}
            busy={busy}
            contextPlace={panel.contextPlace}
            layout={layout}
            contextId={activeEventId}
            lat={lat}
            lng={lng}
            authUserId={authUserId}
          />
        ) : null}
        {hasLodgingResources && showCarousel && !mapMediaFocusOpen ? (
          <GlobeLodgingMapStrip
            ranked={rankedResources}
            activeIndex={Math.min(carouselIndex, rankedResources.length - 1)}
            onSelectIndex={handleCarouselIndexChange}
          />
        ) : null}
    <aside
      className={cn(
        "pointer-events-auto overflow-hidden rounded-[1.35rem] border border-border/60 bg-card/95 shadow-[0_12px_40px_rgba(2,32,71,0.12)] backdrop-blur-xl",
        layout === "hero" ? "w-full max-w-md" : variant === "compact" ? COMPACT_PANEL_WIDTH : PANEL_WIDTH,
        className,
      )}
      data-globe-context-hub-rail
      data-globe-context-hub-rail-expanded="true"
      aria-label={copy.globe.contextHubRailTitle}
    >
      <div className="flex items-start gap-2 border-b border-border/50 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
            {copy.globe.contextHubEyebrow}
          </p>
          <p className="text-[13px] font-semibold leading-tight text-foreground">
            {copy.globe.contextHubRailTitle}
          </p>
          <p
            className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground"
            title={panel.contextPlace}
          >
            {copy.globe.contextHubRailForContext(panel.contextPlace)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60 active:bg-muted"
          aria-expanded
          aria-label={copy.globe.contextHubCollapseAria}
          data-globe-hub-rail-collapse
        >
          <ChevronDown className="size-4 rotate-180 text-muted-foreground" aria-hidden />
        </button>
      </div>

      <ul className="space-y-1.5 px-2 py-2">
        {browseRows.map((row) => (
          <HubServiceSlot
            key={row.serviceId}
            row={row}
            connectOpen={connectServiceId === row.serviceId}
            busy={busy}
            emphasized={
              rankedResources[carouselIndex]?.hubRow.serviceId === row.serviceId
            }
            onToggleConnect={() => {
              if (row.serviceId === "ticket") {
                setTicketConnectOpen(true);
                return;
              }
              if (row.serviceId === "lodging") {
                void handleConnectLodging();
                return;
              }
              setConnectServiceId((current) =>
                current === row.serviceId ? null : row.serviceId,
              );
            }}
            onConnectFlight={(airportId) => void handleConnectFlight(airportId)}
            onConnectLodging={() => void handleConnectLodging()}
            onOpenAction={(url, label) => handleOpenAction(url, label)}
            onOpenHandoff={(href, label, internalRoute) =>
              handleOpenHandoff(href, label, internalRoute)
            }
          />
        ))}
      </ul>
    </aside>
      </div>
    </>
  );
}
