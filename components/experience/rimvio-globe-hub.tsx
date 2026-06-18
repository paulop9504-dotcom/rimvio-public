"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { RimvioGlobe3DClient } from "@/components/experience/rimvio-globe-3d-client";
import type { RimvioGlobe3DHandle } from "@/components/experience/rimvio-globe-3d";
import { useExperienceGraph } from "@/hooks/use-experience-graph";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { useRelationshipFeedSlots } from "@/hooks/use-relationship-feed-slots";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import { buildFeedSlotPeerLookup } from "@/lib/feed/build-feed-slot-peer-lookup";
import { enrichClassifiedGlobePinPeers } from "@/lib/globe/project-globe-pin-peers";
import { enrichClassifiedGlobePinSharedWith } from "@/lib/globe/enrich-globe-pin-shared-with";
import { EXPERIENCE_BRIDGE_UPDATED } from "@/lib/experience-bridge/local-bridge-store";
import { applyPinCoordOverrides } from "@/lib/globe/apply-pin-coord-overrides";
import {
  matchesGlobeContextTimeFilter,
  type GlobeContextTimeFilter,
} from "@/lib/globe/globe-context-time-filter";
import {
  matchesGlobeContextPeopleFilter,
  type GlobeContextPeopleFilter,
} from "@/lib/globe/globe-context-people-filter";
import {
  type GlobeDetailLevel,
} from "@/lib/globe/globe-zoom-levels";
import { projectGlobeZoomClusterPins } from "@/lib/globe/project-globe-zoom-cluster-pins";
import { projectGlobePinDisplayMode } from "@/lib/globe/project-globe-pin-display-mode";
import { resolveGlobeStartupView } from "@/lib/globe/resolve-globe-startup-view";
import { ensureGlobeDemoEvents } from "@/lib/experience-graph/seed-globe-demo-events";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { indexEventsById } from "@/lib/plan-context/project-plan-to-feed-slot";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import {
  findPinClusterByEventId,
  findPinClusterByPinId,
  projectPinClusterClassifiedPins,
  projectPinClustersFromGraph,
} from "@/lib/globe/project-pin-clusters";
import { projectGlobeTripArcs } from "@/lib/globe/project-trip-leg-arcs";
import { applyFocusedHubGlobePins } from "@/lib/globe/context-hub/apply-focused-hub-globe-visuals";
import {
  dispatchGlobeLodgingFocus,
  subscribeGlobeLodgingFocus,
} from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import { subscribeGlobeMapMediaFocus } from "@/lib/globe/globe-map-media-focus-bridge";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { isLodgingHubEnabled } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { projectLodgingGlobeMarkers } from "@/lib/globe/context-hub/project-lodging-globe-markers";
import { projectContextHubGlobeAnchor } from "@/lib/globe/context-hub/project-context-hub-globe-anchor";
import { dispatchGlobeContextHubOpen } from "@/lib/globe/context-hub/globe-context-hub-open-bridge";
import { rankContextResources } from "@/lib/globe/resource/rank-context-resources";
import {
  GLOBE_EXPERIENCE_SETTINGS_UPDATED,
  isShowContextWarmthEnabled,
} from "@/lib/globe/globe-experience-settings";
import { buildGlobeContextWarmthPoints } from "@/lib/globe/build-globe-context-warmth-points";
import { cn } from "@/lib/utils";

function useGlobeEventSnapshot() {
  const [ready, setReady] = useState(false);
  const [eventsById, setEventsById] = useState<ReadonlyMap<string, EventCandidate>>(
    () => new Map<string, EventCandidate>(),
  );
  const [personalPinRevision, setPersonalPinRevision] = useState(0);

  useEffect(() => {
    ensureGlobeDemoEvents();
    const refreshEvents = () => {
      setEventsById(indexEventsById(listLifeEventCandidates()));
      setReady(true);
    };
    const refreshPersonalPins = () => {
      setPersonalPinRevision((value) => value + 1);
    };
    refreshEvents();
    window.addEventListener(EVENT_CANDIDATES_UPDATED, refreshEvents);
    window.addEventListener(PERSONAL_GLOBE_PINS_UPDATED, refreshPersonalPins);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, refreshEvents);
      window.removeEventListener(PERSONAL_GLOBE_PINS_UPDATED, refreshPersonalPins);
    };
  }, []);

  return { ready, eventsById, personalPinRevision };
}

export type RimvioGlobeHubHandle = {
  flyToPin: RimvioGlobe3DHandle["flyToPin"];
  clearPinViewportBias: RimvioGlobe3DHandle["clearPinViewportBias"];
  resetToOverview: () => void;
  getPointOfView: RimvioGlobe3DHandle["getPointOfView"];
  getScreenCoords: RimvioGlobe3DHandle["getScreenCoords"];
};

export type RimvioGlobeHubProps = {
  className?: string;
  globeRef?: Ref<RimvioGlobeHubHandle>;
  initialOpenPinId?: string | null;
  initialRecallEventId?: string | null;
  /** Fallback when context is not yet projected as a globe pin cluster. */
  onRecallEventId?: (eventId: string) => void;
  /** Highlight pin card while pin sheet is open — does not lock zoom. */
  highlightedPinId?: string | null;
  onPinPress?: (cluster: PinCluster) => void;
  /** Zoomed-out cluster badge — multiple contexts at one tap. */
  onContextGroupPress?: (clusters: readonly PinCluster[]) => void;
  pinRelocateEnabled?: boolean;
  onPinRelocate?: (input: {
    pinId: string;
    sourceEventId: string;
    lat: number;
    lng: number;
  }) => void;
  timeFilter?: GlobeContextTimeFilter;
  peopleFilter?: GlobeContextPeopleFilter;
  pinCoordOverrides?: ReadonlyMap<
    string,
    { lat: number; lng: number }
  >;
  skipStartupFly?: boolean;
  onGlobePress?: (coords: { lat: number; lng: number }) => void;
  onClustersSnapshot?: (clusters: readonly PinCluster[]) => void;
  onDetailLevelChange?: (level: GlobeDetailLevel) => void;
  /** Pending Experience Bridge invites — ghost pins until accept. */
  bridgeGhostClusters?: readonly PinCluster[];
  /** Stop WebGL render loop while sheets cover the globe. */
  renderSuspended?: boolean;
  /** Selected context — draw hub connector arc on the globe. */
  focusedContextEventId?: string | null;
  /** Hub map anchor press — opens Hub detail, not pin info sheet. */
  onContextHubAnchorPress?: (contextEventId: string) => void;
};

type RimvioGlobeHubBodyProps = {
  className?: string;
  globeRef?: Ref<RimvioGlobeHubHandle>;
  clusters: readonly PinCluster[];
  eventsById: ReadonlyMap<string, EventCandidate>;
  initialOpenPinId?: string | null;
  highlightedPinId?: string | null;
  onPinPress?: (cluster: PinCluster) => void;
  /** Zoomed-out cluster badge — multiple contexts at one tap. */
  onContextGroupPress?: (clusters: readonly PinCluster[]) => void;
  pinRelocateEnabled?: boolean;
  onPinRelocate?: (input: {
    pinId: string;
    sourceEventId: string;
    lat: number;
    lng: number;
  }) => void;
  pinCoordOverrides?: ReadonlyMap<
    string,
    { lat: number; lng: number }
  >;
  skipStartupFly?: boolean;
  onGlobePress?: (coords: { lat: number; lng: number }) => void;
  onDetailLevelChange?: (level: GlobeDetailLevel) => void;
  renderSuspended?: boolean;
  focusedContextEventId?: string | null;
  onContextHubAnchorPress?: (contextEventId: string) => void;
};

const RimvioGlobeHubBody = memo(
  forwardRef<RimvioGlobeHubHandle, RimvioGlobeHubBodyProps>(function RimvioGlobeHubBody(
    {
      className,
      clusters,
      eventsById,
      initialOpenPinId,
      highlightedPinId,
      onPinPress,
      onContextGroupPress,
      pinRelocateEnabled = false,
      onPinRelocate,
      pinCoordOverrides,
      skipStartupFly = false,
      onGlobePress,
      onDetailLevelChange,
      renderSuspended = false,
      focusedContextEventId = null,
      onContextHubAnchorPress,
    },
    ref,
  ) {
    const innerGlobeRef = useRef<RimvioGlobe3DHandle>(null);
    const startupFlownRef = useRef(false);
    const [detailLevel, setDetailLevel] = useState<GlobeDetailLevel>("space");
    const [bridgeRevision, setBridgeRevision] = useState(0);
    const [activeLodgingResourceId, setActiveLodgingResourceId] = useState<string | null>(
      null,
    );
    const [mapMediaFocusOpen, setMapMediaFocusOpen] = useState(false);
    const [expandedPinId, setExpandedPinId] = useState<string | null>(null);
    useEffect(() => {
      const bump = () => setBridgeRevision((value) => value + 1);
      window.addEventListener(EXPERIENCE_BRIDGE_UPDATED, bump);
      return () => window.removeEventListener(EXPERIENCE_BRIDGE_UPDATED, bump);
    }, []);
    useEffect(() => {
      return subscribeGlobeLodgingFocus((detail) => {
        setActiveLodgingResourceId(detail.resourceId);
      });
    }, []);
    useEffect(() => {
      return subscribeGlobeMapMediaFocus((detail) => {
        setMapMediaFocusOpen(detail.open);
        if (detail.open) {
          setExpandedPinId(null);
        }
      });
    }, []);
    useEffect(() => {
      setActiveLodgingResourceId(null);
      setMapMediaFocusOpen(false);
      setExpandedPinId(null);
    }, [focusedContextEventId]);
    const handleDetailLevelChange = useCallback(
      (level: GlobeDetailLevel) => {
        setDetailLevel(level);
        onDetailLevelChange?.(level);
      },
      [onDetailLevelChange],
    );
    const { slots: relationshipSlots } = useRelationshipFeedSlots(true);
    const peerLookup = useMemo(
      () =>
        buildFeedSlotPeerLookup({
          messages: [],
          relationshipSlots,
          contacts: readPeerContacts(),
        }),
      [relationshipSlots],
    );
    const classifiedPins = useMemo(
      () =>
        enrichClassifiedGlobePinSharedWith(
          enrichClassifiedGlobePinPeers(
            projectPinClusterClassifiedPins(clusters, eventsById),
            eventsById,
            peerLookup,
          ),
          peerLookup,
        ),
      [clusters, eventsById, peerLookup, bridgeRevision],
    );
    const { enabled: gpsEnabled } = useGpsTrackingEnabled();
    const liveLocation = useLiveLocationSnapshot();
    const displayPins = useMemo(() => {
      const withDisplay = projectGlobePinDisplayMode({
        pins: classifiedPins,
        eventsById,
        focusedEventId: focusedContextEventId,
        expandedPinId,
        lodgingFocusStageOpen: mapMediaFocusOpen,
        viewerLat: liveLocation?.lat ?? null,
        viewerLng: liveLocation?.lng ?? null,
      });
      const withOverrides = applyPinCoordOverrides(
        withDisplay,
        pinCoordOverrides ?? new Map(),
      );
      const zoomed = projectGlobeZoomClusterPins(withOverrides, detailLevel);
      return applyFocusedHubGlobePins(zoomed, {
        focusedEventId: focusedContextEventId,
        eventsById,
      });
    }, [
      classifiedPins,
      eventsById,
      expandedPinId,
      mapMediaFocusOpen,
      liveLocation?.lat,
      liveLocation?.lng,
      pinCoordOverrides,
      detailLevel,
      focusedContextEventId,
    ]);
    const [contextWarmthEnabled, setContextWarmthEnabled] = useState(() =>
      isShowContextWarmthEnabled(),
    );
    useEffect(() => {
      const sync = () => {
        setContextWarmthEnabled(isShowContextWarmthEnabled());
      };
      sync();
      window.addEventListener(GLOBE_EXPERIENCE_SETTINGS_UPDATED, sync);
      return () => window.removeEventListener(GLOBE_EXPERIENCE_SETTINGS_UPDATED, sync);
    }, []);
    const tripArcs = useMemo(
      () =>
        projectGlobeTripArcs({
          eventsById,
          clusters,
          focusedEventId: focusedContextEventId,
          // Arc only while a hubbed context is selected — never ambient “all trips”.
          showBackgroundTripArcs: false,
        }),
      [eventsById, clusters, focusedContextEventId],
    );
    const contextWarmthPoints = useMemo(
      () => buildGlobeContextWarmthPoints(clusters),
      [clusters],
    );
    const lodgingGlobeMarkers = useMemo(() => {
      void bridgeRevision;
      const eventId = focusedContextEventId?.trim();
      if (!eventId) {
        return [];
      }
      const event = eventsById.get(eventId);
      if (!event || !isLodgingHubEnabled(event)) {
        return [];
      }
      const panel = listContextHubServicesForEvent(event);
      if (!panel) {
        return [];
      }
      const ranked = rankContextResources({
        event,
        services: panel.services,
        lat: liveLocation?.lat ?? null,
        lng: liveLocation?.lng ?? null,
      });
      const raw = projectLodgingGlobeMarkers({
        ranked,
        activeResourceId: activeLodgingResourceId,
      });
      if (!mapMediaFocusOpen) {
        return raw;
      }
      return [];
    }, [
      activeLodgingResourceId,
      bridgeRevision,
      eventsById,
      focusedContextEventId,
      liveLocation?.lat,
      liveLocation?.lng,
      mapMediaFocusOpen,
    ]);
    const contextHubAnchor = useMemo(() => {
      const eventId = focusedContextEventId?.trim();
      if (!eventId) {
        return null;
      }
      const event = eventsById.get(eventId);
      const cluster = clusters.find((row) => row.eventId === eventId);
      if (!event || !cluster) {
        return null;
      }
      return projectContextHubGlobeAnchor({
        event,
        lat: cluster.lat,
        lng: cluster.lng,
      });
    }, [clusters, eventsById, focusedContextEventId]);
    const globePins = useMemo(() => {
      if (mapMediaFocusOpen) {
        return [];
      }
      const pins: ClassifiedGlobePin[] = [...displayPins];
      if (gpsEnabled && liveLocation) {
        pins.push({
          id: "viewer:here",
          kind: "gps",
          label: "현재 위치",
          lat: liveLocation.lat,
          lng: liveLocation.lng,
          pinX: 0,
          pinY: 0,
          pinShape: "viewer",
          emphasis: "primary",
        });
      }
      return pins;
    }, [displayPins, gpsEnabled, liveLocation, mapMediaFocusOpen]);
    const [activePinId, setActivePinId] = useState<string | null>(null);
    const displayPinId =
      highlightedPinId !== undefined ? highlightedPinId : activePinId;

    useImperativeHandle(ref, () => ({
      flyToPin(lat, lng, level, options) {
        innerGlobeRef.current?.flyToPin(lat, lng, level, options);
      },
      clearPinViewportBias() {
        innerGlobeRef.current?.clearPinViewportBias();
      },
      resetToOverview() {
        innerGlobeRef.current?.resetOverview();
      },
      getPointOfView() {
        return innerGlobeRef.current?.getPointOfView() ?? null;
      },
      getScreenCoords(lat, lng) {
        return innerGlobeRef.current?.getScreenCoords(lat, lng) ?? null;
      },
    }));

    useEffect(() => {
      const seed = initialOpenPinId?.trim();
      if (seed) {
        setActivePinId(seed);
      }
    }, [initialOpenPinId]);

    useEffect(() => {
      if (skipStartupFly || startupFlownRef.current || clusters.length === 0) {
        return;
      }
      const view = resolveGlobeStartupView(clusters);
      if (!view) {
        return;
      }
      startupFlownRef.current = true;
      const timer = window.setTimeout(() => {
        innerGlobeRef.current?.flyToPin(view.lat, view.lng, view.level);
      }, 480);
      return () => window.clearTimeout(timer);
    }, [clusters, skipStartupFly]);

    const handlePinPress = useCallback(
      (pinId: string) => {
        if (pinId === "viewer:here") {
          return;
        }
        const pressedPin = displayPins.find((row) => row.id === pinId);
        if (pressedPin?.pinShape === "dot") {
          setExpandedPinId(pinId);
          innerGlobeRef.current?.flyToPin(
            pressedPin.lat,
            pressedPin.lng,
            "neighborhood",
          );
        } else {
          setExpandedPinId(null);
        }
        if (pinId.startsWith("cluster:")) {
          const memberPinIds = pinId
            .slice("cluster:".length)
            .split("|")
            .map((row) => row.trim())
            .filter(Boolean);
          const memberClusters = memberPinIds
            .map((memberId) => findPinClusterByPinId(clusters, memberId))
            .filter((row): row is PinCluster => row != null);
          if (memberClusters.length === 1) {
            setActivePinId(memberClusters[0]!.pinId);
            onPinPress?.(memberClusters[0]!);
            return;
          }
          if (memberClusters.length > 1) {
            onContextGroupPress?.(memberClusters);
            return;
          }
          const pin = displayPins.find((row) => row.id === pinId);
          if (pin) {
            innerGlobeRef.current?.flyToPin(pin.lat, pin.lng, "city");
          }
          return;
        }
        setActivePinId(pinId);
        const cluster = findPinClusterByPinId(clusters, pinId);
        if (cluster) {
          onPinPress?.(cluster);
          return;
        }
        const pin = displayPins.find((row) => row.id === pinId);
        const eventId = pin?.sourceEventId?.trim();
        if (eventId) {
          const byEvent = findPinClusterByEventId(clusters, eventId);
          if (byEvent) {
            setActivePinId(byEvent.pinId);
            onPinPress?.(byEvent);
          }
        }
      },
      [clusters, displayPins, onContextGroupPress, onPinPress],
    );

    const handleGlobePress = useCallback(
      (coords: { lat: number; lng: number }) => {
        setExpandedPinId(null);
        onGlobePress?.(coords);
      },
      [onGlobePress],
    );

    return (
      <div
        className={cn("relative flex h-full min-h-0 flex-1 flex-col", className)}
        data-rimvio-globe-hub
        data-rimvio-globe-surface="globe3d"
      >
        <RimvioGlobe3DClient
          ref={innerGlobeRef}
          pins={globePins}
          tripArcs={tripArcs}
          contextWarmthPoints={contextWarmthPoints}
          contextWarmthEnabled={contextWarmthEnabled}
          viewerLocation={
            gpsEnabled && liveLocation
              ? {
                  lat: liveLocation.lat,
                  lng: liveLocation.lng,
                  accuracyM: liveLocation.accuracyM,
                }
              : null
          }
          activePinId={displayPinId}
          expandedPinId={expandedPinId}
          className="h-full flex-1"
          onPinPress={handlePinPress}
          pinRelocateEnabled={pinRelocateEnabled}
          onPinRelocate={onPinRelocate}
          onGlobePress={handleGlobePress}
          onDetailLevelChange={handleDetailLevelChange}
          renderSuspended={renderSuspended}
          lodgingMarkers={lodgingGlobeMarkers}
          onLodgingMarkerPress={(resourceId, carouselIndex) => {
            dispatchGlobeLodgingFocus({
              resourceId,
              carouselIndex,
              source: "map_marker",
            });
          }}
          hubAnchors={
            mapMediaFocusOpen || !contextHubAnchor ? [] : [contextHubAnchor]
          }
          onContextHubAnchorPress={(contextEventId) => {
            dispatchGlobeContextHubOpen({ contextEventId, source: "map_anchor" });
            onContextHubAnchorPress?.(contextEventId);
          }}
        />

        {clusters.length === 0 ? (
          <p
            className="pointer-events-none absolute inset-x-0 top-[max(4.5rem,env(safe-area-inset-top))] z-10 mx-auto w-fit max-w-[85%] rounded-full bg-white/90 px-3.5 py-1.5 text-center text-[12px] font-medium text-[#8b95a1] shadow-sm backdrop-blur-md"
            data-rimvio-globe-hub-empty
          >
            기록이 쌓이면 지구에 핀이 나타납니다.
          </p>
        ) : null}
      </div>
    );
  }),
);

/** Globe-first home — 3D earth only. */
export const RimvioGlobeHub = memo(function RimvioGlobeHub({
  className,
  globeRef,
  initialOpenPinId,
  initialRecallEventId,
  onRecallEventId,
  highlightedPinId,
  onPinPress,
  onContextGroupPress,
  pinRelocateEnabled,
  onPinRelocate,
  timeFilter = "all",
  peopleFilter = null,
  pinCoordOverrides,
  onGlobePress,
  onClustersSnapshot,
  onDetailLevelChange,
  bridgeGhostClusters,
  renderSuspended,
  focusedContextEventId,
  onContextHubAnchorPress,
}: RimvioGlobeHubProps) {
  const { ready, eventsById, personalPinRevision } = useGlobeEventSnapshot();
  const { graph } = useExperienceGraph(ready ? eventsById : undefined);
  const recallOpenedRef = useRef(false);
  const onClustersSnapshotRef = useRef(onClustersSnapshot);
  onClustersSnapshotRef.current = onClustersSnapshot;

  const clusters = useMemo(() => {
    if (!ready) {
      return [];
    }
    const all = projectPinClustersFromGraph({
      volumes: graph.volumes,
      eventsById,
    });
    return all.filter(
      (cluster) =>
        matchesGlobeContextTimeFilter(cluster.startedAtIso, timeFilter) &&
        matchesGlobeContextPeopleFilter(cluster.eventId, peopleFilter, eventsById),
    );
  }, [ready, graph.volumes, eventsById, personalPinRevision, timeFilter, peopleFilter]);

  const displayClusters = useMemo(() => {
    const ghosts = bridgeGhostClusters ?? [];
    if (ghosts.length === 0) {
      return clusters;
    }
    return [...clusters, ...ghosts];
  }, [clusters, bridgeGhostClusters]);

  useEffect(() => {
    onClustersSnapshotRef.current?.(displayClusters);
  }, [displayClusters]);

  useEffect(() => {
    if (!ready || recallOpenedRef.current) {
      return;
    }
    if (!onPinPress && !onRecallEventId) {
      return;
    }
    const eventId = initialRecallEventId?.trim();
    if (!eventId) {
      return;
    }
    const cluster = findPinClusterByEventId(displayClusters, eventId);
    recallOpenedRef.current = true;
    if (cluster && onPinPress) {
      onPinPress(cluster);
      return;
    }
    onRecallEventId?.(eventId);
  }, [ready, displayClusters, initialRecallEventId, onPinPress, onRecallEventId]);

  if (!ready) {
    return (
      <div
        className={cn(
          "rimvio-globe-space rimvio-globe-space--toss flex min-h-[60vh] flex-1 items-center justify-center px-6 text-center text-[14px] text-[#8b95a1]",
          className,
        )}
        data-rimvio-globe-hub-loading
      >
        지구 불러오는 중…
      </div>
    );
  }

  return (
    <RimvioGlobeHubBody
      ref={globeRef}
      className={className}
      clusters={displayClusters}
      eventsById={eventsById}
      initialOpenPinId={initialOpenPinId}
      highlightedPinId={highlightedPinId}
      onPinPress={onPinPress}
      onContextGroupPress={onContextGroupPress}
      pinRelocateEnabled={pinRelocateEnabled}
      onPinRelocate={onPinRelocate}
      pinCoordOverrides={pinCoordOverrides}
      onGlobePress={onGlobePress}
      onDetailLevelChange={onDetailLevelChange}
      skipStartupFly={Boolean(
        initialRecallEventId?.trim() || initialOpenPinId?.trim(),
      )}
      renderSuspended={renderSuspended}
      focusedContextEventId={focusedContextEventId}
      onContextHubAnchorPress={onContextHubAnchorPress}
    />
  );
});
