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
import { projectTripLegArcs } from "@/lib/globe/project-trip-leg-arcs";
import {
  GLOBE_EXPERIENCE_SETTINGS_UPDATED,
  isShowContextWarmthEnabled,
  isShowTripArcsEnabled,
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
    },
    ref,
  ) {
    const innerGlobeRef = useRef<RimvioGlobe3DHandle>(null);
    const startupFlownRef = useRef(false);
    const [detailLevel, setDetailLevel] = useState<GlobeDetailLevel>("space");
    const [bridgeRevision, setBridgeRevision] = useState(0);
    useEffect(() => {
      const bump = () => setBridgeRevision((value) => value + 1);
      window.addEventListener(EXPERIENCE_BRIDGE_UPDATED, bump);
      return () => window.removeEventListener(EXPERIENCE_BRIDGE_UPDATED, bump);
    }, []);
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
    const displayPins = useMemo(() => {
      const withOverrides = applyPinCoordOverrides(
        classifiedPins,
        pinCoordOverrides ?? new Map(),
      );
      return projectGlobeZoomClusterPins(withOverrides, detailLevel);
    }, [classifiedPins, pinCoordOverrides, detailLevel]);
    const [tripArcsEnabled, setTripArcsEnabled] = useState(() => isShowTripArcsEnabled());
    const [contextWarmthEnabled, setContextWarmthEnabled] = useState(() =>
      isShowContextWarmthEnabled(),
    );
    useEffect(() => {
      const sync = () => {
        setTripArcsEnabled(isShowTripArcsEnabled());
        setContextWarmthEnabled(isShowContextWarmthEnabled());
      };
      sync();
      window.addEventListener(GLOBE_EXPERIENCE_SETTINGS_UPDATED, sync);
      return () => window.removeEventListener(GLOBE_EXPERIENCE_SETTINGS_UPDATED, sync);
    }, []);
    const tripArcs = useMemo(
      () =>
        tripArcsEnabled
          ? projectTripLegArcs({ eventsById, clusters })
          : [],
      [eventsById, clusters, tripArcsEnabled],
    );
    const contextWarmthPoints = useMemo(
      () => buildGlobeContextWarmthPoints(clusters),
      [clusters],
    );
    const { enabled: gpsEnabled } = useGpsTrackingEnabled();
    const liveLocation = useLiveLocationSnapshot();
    const globePins = useMemo(() => {
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
    }, [displayPins, gpsEnabled, liveLocation]);
    const [activePinId, setActivePinId] = useState<string | null>(null);
    const displayPinId =
      highlightedPinId !== undefined ? highlightedPinId : activePinId;

    useImperativeHandle(ref, () => ({
      flyToPin(lat, lng, level) {
        innerGlobeRef.current?.flyToPin(lat, lng, level);
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
          const pin = globePins.find((row) => row.id === pinId);
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
        const pin = globePins.find((row) => row.id === pinId);
        const eventId = pin?.sourceEventId?.trim();
        if (eventId) {
          const byEvent = findPinClusterByEventId(clusters, eventId);
          if (byEvent) {
            setActivePinId(byEvent.pinId);
            onPinPress?.(byEvent);
          }
        }
      },
      [clusters, globePins, onContextGroupPress, onPinPress],
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
          className="h-full flex-1"
          onPinPress={handlePinPress}
          pinRelocateEnabled={pinRelocateEnabled}
          onPinRelocate={onPinRelocate}
          onGlobePress={onGlobePress}
          onDetailLevelChange={handleDetailLevelChange}
          renderSuspended={renderSuspended}
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
    />
  );
});
