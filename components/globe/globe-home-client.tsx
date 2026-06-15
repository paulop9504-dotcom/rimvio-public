"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { RimvioGlobeHubClient } from "@/components/experience/rimvio-globe-hub-client";
import { GlobeBackerLink } from "@/components/globe/globe-backer-link";
import { GlobeContextControlDock } from "@/components/globe/globe-context-control-dock";
import { GlobeContextMapVideoStage } from "@/components/globe/globe-context-map-video-stage";
import { GlobeContextIngestBar, type GlobeContextIngestBarHandle } from "@/components/globe/globe-context-ingest-bar";
import { GlobeFirstVisitCoach } from "@/components/globe/globe-first-visit-coach";
import { GlobeContextListSheet } from "@/components/globe/globe-context-list-sheet";
import { GlobeContextManageSheet } from "@/components/globe/globe-context-manage-sheet";
import { GlobeContextStackPicker } from "@/components/globe/globe-context-stack-picker";
import { GlobeCreateContextSheet } from "@/components/globe/globe-create-context-sheet";
import { GlobeContextShareSheet } from "@/components/globe/globe-context-share-sheet";
import { GlobeInboxSheet, GlobeInboxTrigger } from "@/components/globe/globe-inbox-sheet";
import {
  GlobeMediaPoolSheet,
  GlobeMediaPoolTrigger,
} from "@/components/globe/globe-media-pool-sheet";
import { ExperienceBridgeGhostSheet } from "@/components/globe/experience-bridge-ghost-sheet";
import { GlobeSettingsSheet } from "@/components/globe/globe-settings-sheet";
import { PinOpenSheet } from "@/components/globe/pin-open-sheet";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { setLiveLocationPowerMode } from "@/lib/location-ping/live-location-service";
import { usePersonalGlobePinSync } from "@/hooks/use-personal-globe-pin-sync";
import { useGlobeInbox } from "@/hooks/use-globe-inbox";
import { useMediaPool } from "@/hooks/use-media-pool";
import { useGlobeTripArrival } from "@/hooks/use-globe-trip-arrival";
import { useGlobeContextPlaceAlignment } from "@/hooks/use-globe-context-place-alignment";
import { useBridgeMediaSync } from "@/hooks/use-bridge-media-sync";
import { useAuth } from "@/hooks/use-auth";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { focusGlobeContextOnMap } from "@/lib/globe/focus-globe-context-on-map";
import { attachPoolMediaBatch } from "@/lib/media-pool/attach-pool-media-to-event";
import {
  revertGlobeContextPinToCardPlace,
  resolveGlobeContextCardPinCluster,
} from "@/lib/globe/globe-context-card-coords";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import {
  globeContextTapHitRadiusMeters,
  resolveGlobeContextsNearTap,
} from "@/lib/globe/resolve-globe-contexts-near-tap";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import type { GlobeManageContextEntry } from "@/lib/globe/list-globe-manage-contexts";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { resolveGlobeContextPinCluster } from "@/lib/globe/resolve-globe-context-pin-cluster";
import { listGlobeContextPeerOptions } from "@/lib/globe/list-globe-context-peer-options";
import type { GlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import {
  GLOBE_CONTEXT_SHARE_REQUEST,
  type GlobeContextShareRequestDetail,
} from "@/lib/globe/globe-context-share-request";
import {
  globeContextShouldMapReplayFirst,
  resolveExperienceVolumeForEvent,
} from "@/lib/globe/resolve-globe-context-primary-video";
import { listGlobeContextNavigationOrder } from "@/lib/globe/list-globe-context-navigation-order";
import { projectContextMediaReel } from "@/lib/globe/project-context-media-reel";
import { resolvePinOpenInitialPage } from "@/lib/globe/resolve-pin-open-initial-page";
import type { PinMediaContextPage } from "@/components/globe/pin-open-media-context-pager";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import {
  hydrateMediaContextStore,
  MEDIA_SPACETIME_UPDATED,
} from "@/lib/location-ping/media-context-store";
import { copy } from "@/lib/copy/human-ko";
import { projectBridgeGhostClusters } from "@/lib/experience-bridge/project-bridge-ghost-clusters";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";

const PIN_REVERT_MS = 1_100;
/** Pin tap and globe click fire together — ignore the follow-up globe press. */
const GLOBE_PIN_PRESS_SUPPRESS_MS = 900;

function GlobeHomeBody() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const recallEventId = searchParams.get("recallEvent");
  const globeRef = useRef<RimvioGlobeHubHandle>(null);
  const ingestBarRef = useRef<GlobeContextIngestBarHandle>(null);
  const [globeGuideOpen, setGlobeGuideOpen] = useState(false);
  const liveLocation = useLiveLocationSnapshot();
  usePersonalGlobePinSync(true);
  const {
    bridgeInvites: pendingBridgeInvites,
    locationConfirms,
    totalCount: globeInboxCount,
    refreshBridgeInvites,
    dismissBridgeInvite: dismissInvite,
    dismissLocationConfirm,
    refreshLocationConfirms,
    needsLogin: globeInboxNeedsLogin,
    bridgeError: globeInboxError,
  } = useGlobeInbox(true);
  const { count: mediaPoolCount } = useMediaPool(true);
  const bridgeGhostClusters = useMemo(
    () => projectBridgeGhostClusters(pendingBridgeInvites),
    [pendingBridgeInvites],
  );
  const seenBridgeToastRef = useRef(new Set<string>());
  const seenInboxCountRef = useRef(0);
  const [bridgeGhostOpen, setBridgeGhostOpen] = useState(false);
  const [bridgeGhostInvite, setBridgeGhostInvite] =
    useState<PendingBridgeInvite | null>(null);
  const [bridgeGhostCluster, setBridgeGhostCluster] = useState<PinCluster | null>(
    null,
  );
  const [globeInboxOpen, setGlobeInboxOpen] = useState(false);
  const [mediaPoolOpen, setMediaPoolOpen] = useState(false);
  const [poolAttachIds, setPoolAttachIds] = useState<string[]>([]);
  const [poolSuggestedStart, setPoolSuggestedStart] = useState<string | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareEventId, setShareEventId] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<PinCluster | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pinSheetInitialPage, setPinSheetInitialPage] =
    useState<PinMediaContextPage>("media");
  const [timeFilter, setTimeFilter] = useState<GlobeContextTimeFilter>("all");
  const [peopleFilter, setPeopleFilter] = useState<GlobeContextPeopleFilter>(null);
  const [peerOptionsRevision, setPeerOptionsRevision] = useState(0);
  const [pinDragOverrides, setPinDragOverrides] = useState<
    Map<string, { lat: number; lng: number }>
  >(() => new Map());
  const draggedEventIdRef = useRef<string | null>(null);
  const pinDragActiveRef = useRef(false);
  const revertTimerRef = useRef<number | null>(null);
  const activeClusterRef = useRef<PinCluster | null>(null);
  const sheetOpenRef = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stackClusters, setStackClusters] = useState<PinCluster[] | null>(null);
  const [mediaStoreRevision, setMediaStoreRevision] = useState(0);
  const clustersRef = useRef<readonly PinCluster[]>([]);
  const detailLevelRef = useRef<GlobeDetailLevel>("space");
  const lastPinPressAtRef = useRef(0);

  const onClustersSnapshot = useCallback((clusters: readonly PinCluster[]) => {
    clustersRef.current = clusters;
  }, []);

  const onDetailLevelChange = useCallback((level: GlobeDetailLevel) => {
    detailLevelRef.current = level;
  }, []);

  const schedulePinRevertToCardPlace = useCallback((eventId: string) => {
    if (revertTimerRef.current !== null) {
      window.clearTimeout(revertTimerRef.current);
    }
    revertTimerRef.current = window.setTimeout(() => {
      revertTimerRef.current = null;
      revertGlobeContextPinToCardPlace(eventId);
      const cardCluster = resolveGlobeContextCardPinCluster(eventId);
      if (cardCluster) {
        globeRef.current?.flyToPin(cardCluster.lat, cardCluster.lng, "neighborhood");
      }
    }, PIN_REVERT_MS);
  }, []);

  const clearActiveContext = useCallback(() => {
    const eventId =
      draggedEventIdRef.current?.trim() || activeCluster?.eventId?.trim() || null;
    const hadDragPreview = pinDragActiveRef.current;

    if (revertTimerRef.current !== null) {
      window.clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }

    setSheetOpen(false);
    setActiveCluster(null);
    setStackClusters(null);
    setPinDragOverrides(new Map());
    pinDragActiveRef.current = false;
    draggedEventIdRef.current = null;

    if (eventId && hadDragPreview) {
      schedulePinRevertToCardPlace(eventId);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.has("recallEvent")) {
      params.delete("recallEvent");
      const next = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState(null, "", next);
    }
  }, [activeCluster?.eventId, schedulePinRevertToCardPlace]);

  const openContextCluster = useCallback(
    (cluster: PinCluster, options?: { openSheet?: boolean }) => {
      globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
      setStackClusters(null);
      setActiveCluster(cluster);

      const eventId = cluster.eventId?.trim();
      const event = eventId
        ? findLifeEventCandidate(eventId) ??
          recoverGlobeContextEventFromPin(eventId)
        : null;
      const volume = eventId ? resolveExperienceVolumeForEvent(eventId) : null;
      const hasMapVideo = globeContextShouldMapReplayFirst({
        event,
        cluster,
        volume,
      });
      const openSheet = hasMapVideo
        ? options?.openSheet === true
        : options?.openSheet !== false;
      if (openSheet) {
        setPinSheetInitialPage("media");
      }
      setSheetOpen(openSheet);

      if (!eventId) {
        return;
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("recallEvent") !== eventId) {
        params.set("recallEvent", eventId);
        const next = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", next);
      }
    },
    [],
  );

  const markPinPress = useCallback(() => {
    lastPinPressAtRef.current = Date.now();
  }, []);

  const applyNearbyContexts = useCallback(
    (nearby: readonly PinCluster[], flyCluster?: PinCluster | null) => {
      if (nearby.length === 0) {
        if (activeClusterRef.current != null) {
          clearActiveContext();
          return;
        }
        if (globeContextTapHitRadiusMeters(detailLevelRef.current) == null) {
          return;
        }
        clearActiveContext();
        return;
      }

      if (flyCluster) {
        globeRef.current?.flyToPin(flyCluster.lat, flyCluster.lng, "neighborhood");
      }

      if (nearby.length === 1) {
        if (activeClusterRef.current?.pinId === nearby[0]!.pinId) {
          clearActiveContext();
          return;
        }
        openContextCluster(nearby[0]!);
        return;
      }

      setStackClusters([...nearby]);
      setActiveCluster(null);
      setSheetOpen(false);
    },
    [clearActiveContext, openContextCluster],
  );

  const resolveNearbyAt = useCallback((tapLat: number, tapLng: number) => {
    return resolveGlobeContextsNearTap({
      tapLat,
      tapLng,
      clusters: clustersRef.current,
      detailLevel: detailLevelRef.current,
    });
  }, []);

  const peerOptions = useMemo(() => {
    void peerOptionsRevision;
    return listGlobeContextPeerOptions(listLifeEventCandidates());
  }, [peerOptionsRevision]);

  const activeContextEvent = useMemo(() => {
    const eventId = activeCluster?.eventId?.trim();
    if (!eventId) {
      return null;
    }
    return (
      findLifeEventCandidate(eventId) ?? recoverGlobeContextEventFromPin(eventId)
    );
  }, [activeCluster?.eventId, mediaStoreRevision]);

  const bridgeMediaDeletable = useMemo(() => {
    const id = activeCluster?.eventId?.trim();
    return Boolean(id && isBridgeLinkedEventId(id));
  }, [activeCluster?.eventId]);

  useBridgeMediaSync({
    priorityEventId: activeCluster?.eventId ?? null,
  });

  const activeContextMediaReel = useMemo(() => {
    void mediaStoreRevision;
    const eventId = activeCluster?.eventId?.trim();
    if (!eventId || !activeContextEvent) {
      return [];
    }
    const volume = resolveExperienceVolumeForEvent(eventId);
    return projectContextMediaReel({ event: activeContextEvent, volume });
  }, [activeCluster?.eventId, activeContextEvent, mediaStoreRevision]);

  const navigableContexts = useMemo(() => {
    void peerOptionsRevision;
    void mediaStoreRevision;
    return listGlobeContextNavigationOrder({
      timeFilter,
      peopleFilter,
    });
  }, [peerOptionsRevision, mediaStoreRevision, peopleFilter, timeFilter]);

  const showMapVideoReplay = Boolean(
    activeContextMediaReel.length > 0 &&
      activeCluster?.eventId &&
      !sheetOpen &&
      !stackClusters?.length,
  );

  useEffect(() => {
    const refresh = () => setPeerOptionsRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, refresh);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, refresh);
  }, []);

  useEffect(() => {
    const bump = () => setMediaStoreRevision((value) => value + 1);
    void hydrateMediaContextStore().then(bump);
    window.addEventListener(MEDIA_SPACETIME_UPDATED, bump);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => {
      window.removeEventListener(MEDIA_SPACETIME_UPDATED, bump);
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
    };
  }, []);

  useEffect(() => {
    if (!activeCluster?.eventId || stackClusters?.length || sheetOpen) {
      return;
    }
    void mediaStoreRevision;
    const eventId = activeCluster.eventId.trim();
    const volume = resolveExperienceVolumeForEvent(eventId);
    const shouldMapFirst = globeContextShouldMapReplayFirst({
      event: activeContextEvent,
      cluster: activeCluster,
      volume,
    });
    if (shouldMapFirst) {
      setSheetOpen(false);
    }
  }, [
    activeCluster?.eventId,
    activeCluster?.pinId,
    activeContextEvent,
    mediaStoreRevision,
    sheetOpen,
    stackClusters?.length,
  ]);

  useEffect(() => {
    for (const invite of pendingBridgeInvites) {
      const eventId = invite.state.bridge.eventId;
      if (seenBridgeToastRef.current.has(eventId)) {
        continue;
      }
      seenBridgeToastRef.current.add(eventId);
      const host = invite.state.participants.find((row) => row.role === "host");
      const hostName =
        host?.displayName?.trim() || copy.globe.bridgeInviteHostFallback;
      toast.message(
        copy.globe.bridgeInviteToast(hostName, invite.state.bridge.title),
        {
          action: {
            label: "수신함",
            onClick: () => setGlobeInboxOpen(true),
          },
        },
      );
    }
  }, [pendingBridgeInvites]);

  useEffect(() => {
    if (globeInboxCount <= seenInboxCountRef.current) {
      seenInboxCountRef.current = globeInboxCount;
      return;
    }
    const delta = globeInboxCount - seenInboxCountRef.current;
    seenInboxCountRef.current = globeInboxCount;
    if (delta > 0 && pendingBridgeInvites.length === 0) {
      toast.message(copy.globe.inboxToastNew(delta), {
        action: {
          label: "수신함",
          onClick: () => setGlobeInboxOpen(true),
        },
      });
    }
  }, [globeInboxCount, pendingBridgeInvites.length]);

  useEffect(() => {
    const onShareRequest = (event: Event) => {
      const detail = (event as CustomEvent<GlobeContextShareRequestDetail>).detail;
      const eventId = detail?.eventId?.trim();
      if (!eventId) {
        return;
      }
      setShareEventId(eventId);
      setShareSheetOpen(true);
    };
    window.addEventListener(GLOBE_CONTEXT_SHARE_REQUEST, onShareRequest);
    return () => window.removeEventListener(GLOBE_CONTEXT_SHARE_REQUEST, onShareRequest);
  }, []);

  const onContextGroupPress = useCallback(
    (clusters: readonly PinCluster[]) => {
      markPinPress();
      applyNearbyContexts(clusters, clusters[0] ?? null);
    },
    [applyNearbyContexts, markPinPress],
  );

  const onPinPress = useCallback(
    (cluster: PinCluster) => {
      markPinPress();
      if (cluster.variant === "bridge_ghost") {
        const invite = pendingBridgeInvites.find(
          (row) => row.state.bridge.eventId === cluster.eventId,
        );
        if (invite) {
          globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
          setBridgeGhostInvite(invite);
          setBridgeGhostCluster(cluster);
          setBridgeGhostOpen(true);
        }
        return;
      }
      openContextCluster(cluster);
    },
    [markPinPress, openContextCluster, pendingBridgeInvites],
  );

  const onGlobePress = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (pinDragActiveRef.current) {
        return;
      }
      if (Date.now() - lastPinPressAtRef.current < GLOBE_PIN_PRESS_SUPPRESS_MS) {
        return;
      }
      applyNearbyContexts(resolveNearbyAt(coords.lat, coords.lng));
    },
    [applyNearbyContexts, resolveNearbyAt],
  );

  const onSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setPinSheetInitialPage("media");
    }
  }, []);

  const openMapMediaBridge = useCallback(() => {
    markPinPress();
    const eventId = activeClusterRef.current?.eventId?.trim();
    if (!eventId) {
      setSheetOpen(true);
      return;
    }
    setPinSheetInitialPage(
      resolvePinOpenInitialPage({
        eventId,
        viewerUserId: user?.id,
        fromMapMediaTap: true,
      }),
    );
    setSheetOpen(true);
  }, [markPinPress, user?.id]);

  const focusContextByEventId = useCallback(
    (eventId: string, options?: { openSheet?: boolean }) => {
      const result = focusGlobeContextOnMap(eventId);
      if (!result) {
        toast.error("맥락을 찾지 못했어요");
        return null;
      }
      openContextCluster(result.cluster, options);
      return result.cluster;
    },
    [openContextCluster],
  );

  useGlobeTripArrival(
    {
      onArrival: ({ lat, lng, recallEventId, recallLine, placeLabel }) => {
        globeRef.current?.flyToPin(lat, lng, "neighborhood");
        const nearby = resolveNearbyAt(lat, lng);
        if (nearby.length > 1) {
          applyNearbyContexts(nearby);
          toast.message(recallLine || `${placeLabel} — 이 근처 맥락`);
          return;
        }
        focusContextByEventId(recallEventId);
        toast.message(recallLine || `${placeLabel}에 도착했어요`);
      },
    },
    { enabled: true },
  );

  const focusContextOnMap = useCallback(
    (eventId: string) => {
      focusContextByEventId(eventId, { openSheet: false });
    },
    [focusContextByEventId],
  );

  const onRecallEventId = useCallback(
    (eventId: string) => {
      setListOpen(false);
      setManageOpen(false);
      focusContextByEventId(eventId);
    },
    [focusContextByEventId],
  );

  useEffect(() => {
    const eventId = activeCluster?.eventId?.trim();
    if (!eventId) {
      return;
    }
    const sync = () => {
      if (pinDragActiveRef.current) {
        return;
      }
      const next = resolveGlobeContextPinCluster(eventId);
      if (!next) {
        return;
      }
      setActiveCluster((prev) => {
        if (!prev || prev.eventId !== eventId) {
          return prev;
        }
        if (prev.lat === next.lat && prev.lng === next.lng) {
          return prev;
        }
        globeRef.current?.flyToPin(next.lat, next.lng, "neighborhood");
        return next;
      });
    };
    window.addEventListener(EVENT_CANDIDATES_UPDATED, sync);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, sync);
  }, [activeCluster?.eventId]);

  const onPinRelocate = useCallback(
    (input: { pinId: string; sourceEventId: string; lat: number; lng: number }) => {
      pinDragActiveRef.current = true;
      draggedEventIdRef.current = input.sourceEventId;
      setPinDragOverrides((prev) => {
        const next = new Map(prev);
        next.set(input.pinId, { lat: input.lat, lng: input.lng });
        return next;
      });
      setActiveCluster((prev) =>
        prev?.eventId === input.sourceEventId
          ? { ...prev, lat: input.lat, lng: input.lng }
          : prev,
      );
    },
    [],
  );

  const pinCoordOverrides = useMemo(() => pinDragOverrides, [pinDragOverrides]);

  activeClusterRef.current = activeCluster;
  sheetOpenRef.current = sheetOpen;

  useGlobeContextPlaceAlignment({
    userLat: liveLocation?.lat ?? null,
    userLng: liveLocation?.lng ?? null,
    onAligned: ({ startupView, updated }) => {
      if (
        updated <= 0 ||
        activeClusterRef.current ||
        sheetOpenRef.current ||
        recallEventId ||
        !startupView
      ) {
        return;
      }
      globeRef.current?.flyToPin(
        startupView.lat,
        startupView.lng,
        startupView.level,
      );
    },
  });

  useEffect(() => {
    return () => {
      if (revertTimerRef.current !== null) {
        window.clearTimeout(revertTimerRef.current);
      }
    };
  }, []);

  const onStackSelect = useCallback(
    (cluster: PinCluster) => {
      openContextCluster(cluster);
    },
    [openContextCluster],
  );

  const openContextByEventId = useCallback(
    (eventId: string) => {
      setListOpen(false);
      focusContextByEventId(eventId, { openSheet: true });
    },
    [focusContextByEventId],
  );

  const openProjectedContext = useCallback(
    (entry: GlobeManageContextEntry) => {
      setManageOpen(false);
      focusContextByEventId(entry.eventId, { openSheet: true });
    },
    [focusContextByEventId],
  );

  const openContextEntry = useCallback(
    (entry: GlobeContextTimelineEntry) => {
      openContextByEventId(entry.eventId);
    },
    [openContextByEventId],
  );

  const globeRenderSuspended =
    sheetOpen ||
    createOpen ||
    listOpen ||
    manageOpen ||
    settingsOpen ||
    globeInboxOpen ||
    mediaPoolOpen ||
    bridgeGhostOpen ||
    shareSheetOpen;

  useEffect(() => {
    const dwell =
      liveLocation?.contextLabel === "체류 중" ||
      liveLocation?.contextLabel === "위치 대기";
    const mode = globeRenderSuspended ? "saver" : dwell ? "balanced" : "high";
    setLiveLocationPowerMode(mode);
  }, [globeRenderSuspended, liveLocation?.contextLabel]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <RimvioGlobeHubClient
        globeRef={globeRef}
        className="h-full min-h-0 flex-1"
        initialRecallEventId={recallEventId}
        onRecallEventId={onRecallEventId}
        highlightedPinId={activeCluster?.pinId ?? null}
        onPinPress={onPinPress}
        onContextGroupPress={onContextGroupPress}
        onGlobePress={onGlobePress}
        onClustersSnapshot={onClustersSnapshot}
        onDetailLevelChange={onDetailLevelChange}
        pinRelocateEnabled
        onPinRelocate={onPinRelocate}
        timeFilter={timeFilter}
        peopleFilter={peopleFilter}
        pinCoordOverrides={pinCoordOverrides}
        bridgeGhostClusters={bridgeGhostClusters}
        renderSuspended={globeRenderSuspended}
      />
      <GlobeContextStackPicker
        clusters={stackClusters ?? []}
        visible={Boolean(stackClusters && stackClusters.length > 1)}
        onSelect={onStackSelect}
        onDismiss={clearActiveContext}
        onShowAll={() => {
          setStackClusters(null);
          setListOpen(true);
        }}
      />
      <GlobeContextMapVideoStage
        globeRef={globeRef}
        eventId={activeCluster?.eventId ?? null}
        anchorLat={activeCluster?.lat ?? null}
        anchorLng={activeCluster?.lng ?? null}
        visible={showMapVideoReplay}
        navigationEntries={navigableContexts}
        onDismiss={clearActiveContext}
        onOpenDetails={openMapMediaBridge}
        onNavigateContext={(nextEventId) => {
          focusContextByEventId(nextEventId);
        }}
        viewerUserId={user?.id}
        deletable={bridgeMediaDeletable}
        onMediaDeleted={() => {
          setMediaStoreRevision((value) => value + 1);
          toast.success("삭제했어요");
        }}
      />
      <div className="pointer-events-none absolute left-3 top-[max(0.5rem,env(safe-area-inset-top))] z-20 flex flex-col items-start gap-2">
        <GlobeBackerLink className="pointer-events-auto" />
        <div className="pointer-events-auto">
          <GlobeContextControlDock
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
            peopleFilter={peopleFilter}
            onPeopleFilterChange={setPeopleFilter}
            peerOptions={peerOptions}
            onCreate={() => setCreateOpen(true)}
            onList={() => setListOpen(true)}
            onManage={() => setManageOpen(true)}
            onFlyToHere={
              liveLocation
                ? () =>
                    globeRef.current?.flyToPin(
                      liveLocation.lat,
                      liveLocation.lng,
                      "neighborhood",
                    )
                : undefined
            }
          />
        </div>
      </div>
      <div className="pointer-events-none absolute right-3 top-[max(0.5rem,env(safe-area-inset-top))] z-20 flex items-center gap-2">
        <GlobeMediaPoolTrigger
          count={mediaPoolCount}
          onOpen={() => setMediaPoolOpen(true)}
          className="pointer-events-auto"
        />
        <GlobeInboxTrigger
          count={globeInboxCount}
          onOpen={() => setGlobeInboxOpen(true)}
          className="pointer-events-auto"
        />
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm ring-1 ring-border backdrop-blur-md active:scale-[0.98]"
          aria-label="지구본 설정"
          data-globe-settings-trigger
        >
          <Settings className="size-4 text-primary" aria-hidden />
        </button>
      </div>
      <GlobeContextIngestBar
        ref={ingestBarRef}
        targetEventId={activeCluster?.eventId ?? null}
        targetTitle={activeCluster?.title ?? null}
        forceAttachToTarget={Boolean(activeCluster?.eventId)}
        onAttached={(eventId) => {
          const params = new URLSearchParams(window.location.search);
          if (params.get("recallEvent") !== eventId) {
            params.set("recallEvent", eventId);
            const next = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState(null, "", next);
          }
          focusContextOnMap(eventId);
        }}
      />
      <GlobeMediaPoolSheet
        open={mediaPoolOpen}
        onOpenChange={setMediaPoolOpen}
        activeContextTitle={activeCluster?.title ?? null}
        onAttachToActive={
          activeCluster?.eventId
            ? async (contextIds) => {
                const summary = await attachPoolMediaBatch({
                  contextIds,
                  eventId: activeCluster.eventId,
                  hintTitle: activeCluster.title,
                });
                toast.success(summary.toastLine);
                setMediaStoreRevision((revision) => revision + 1);
                focusContextOnMap(activeCluster.eventId);
              }
            : undefined
        }
        onCreateContext={({ contextIds, startIso }) => {
          setPoolAttachIds(contextIds);
          setPoolSuggestedStart(startIso);
          setCreateOpen(true);
        }}
      />
      <GlobeInboxSheet
        open={globeInboxOpen}
        onOpenChange={setGlobeInboxOpen}
        bridgeInvites={pendingBridgeInvites}
        locationConfirms={locationConfirms}
        needsLogin={globeInboxNeedsLogin}
        loadError={globeInboxError}
        onBridgeAccepted={(eventId) => {
          dismissInvite(eventId);
          void refreshBridgeInvites();
          setGlobeInboxOpen(false);
          focusContextByEventId(eventId, { openSheet: true });
        }}
        onBridgeDeclined={(eventId) => {
          dismissInvite(eventId);
          void refreshBridgeInvites();
        }}
        onLocationConfirmed={(eventId) => {
          dismissLocationConfirm(eventId);
          refreshLocationConfirms();
        }}
        onLocationDismissed={(eventId) => {
          dismissLocationConfirm(eventId);
        }}
      />
      <PinOpenSheet
        open={sheetOpen}
        onOpenChange={onSheetOpenChange}
        cluster={activeCluster}
        initialPage={pinSheetInitialPage}
        onOpenDetail={() => {
          if (activeCluster) {
            globeRef.current?.flyToPin(
              activeCluster.lat,
              activeCluster.lng,
              "pin",
            );
          }
        }}
      />
      <GlobeCreateContextSheet
        open={createOpen}
        initialStartIso={poolSuggestedStart}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setPoolAttachIds([]);
            setPoolSuggestedStart(null);
          }
        }}
        onCreated={({ event }) => {
          const pendingIds = [...poolAttachIds];
          setPoolAttachIds([]);
          setPoolSuggestedStart(null);
          if (pendingIds.length > 0) {
            void attachPoolMediaBatch({
              contextIds: pendingIds,
              eventId: event.id,
              hintTitle: event.title,
            }).then((summary) => {
              toast.success(summary.toastLine);
              setMediaStoreRevision((revision) => revision + 1);
            });
          }
          openContextByEventId(event.id);
        }}
      />
      <GlobeContextListSheet
        open={listOpen}
        onOpenChange={setListOpen}
        onSelect={openContextEntry}
      />
      <GlobeContextManageSheet
        open={manageOpen}
        onOpenChange={setManageOpen}
        onOpenContext={openProjectedContext}
        onDeleted={(eventIds) => {
          if (activeCluster && eventIds.includes(activeCluster.eventId)) {
            setSheetOpen(false);
            setActiveCluster(null);
          }
          const params = new URLSearchParams(window.location.search);
          const recall = params.get("recallEvent");
          if (recall && eventIds.includes(recall)) {
            params.delete("recallEvent");
            const next = params.toString()
              ? `${window.location.pathname}?${params.toString()}`
              : window.location.pathname;
            window.history.replaceState(null, "", next);
          }
        }}
      />
      <ExperienceBridgeGhostSheet
        open={bridgeGhostOpen}
        onOpenChange={setBridgeGhostOpen}
        invite={bridgeGhostInvite}
        cluster={bridgeGhostCluster}
        onAccepted={(eventId) => {
          dismissInvite(eventId);
          void refreshBridgeInvites();
          focusContextByEventId(eventId, { openSheet: true });
        }}
        onDismissed={dismissInvite}
      />
      <GlobeSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onShowGlobeGuide={() => {
          setSettingsOpen(false);
          setGlobeGuideOpen(true);
        }}
      />
      <GlobeContextShareSheet
        open={shareSheetOpen}
        onOpenChange={setShareSheetOpen}
        eventId={shareEventId}
        onShared={() => {
          void refreshBridgeInvites();
        }}
      />
      <GlobeFirstVisitCoach
        open={globeGuideOpen || undefined}
        onOpenChange={setGlobeGuideOpen}
        onAddPhoto={() => ingestBarRef.current?.openPhotoPicker()}
      />
    </div>
  );
}

/** Globe-first home — pins only, tap → replay. */
export function GlobeHomeClient() {
  return (
    <Suspense fallback={null}>
      <GlobeHomeBody />
    </Suspense>
  );
}
