"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { CalendarHeaderControls } from "@/components/calendar/calendar-header-controls";
import { toast } from "sonner";
import { ActiveActionsSheet } from "@/components/action-chat/active-actions-sheet";
import { FeedSlotStage } from "@/components/feed/feed-slot-stage";
import { RelationshipFeedFolder } from "@/components/feed/relationship-feed-folder";
import { RimvioLogo } from "@/components/rimvio-logo";
import { SurfaceStabilityStrip } from "@/components/surface-composition/surface-stability-strip";
import type { SurfaceCompositionRuntimeProps } from "@/components/surface-composition/surface-composition-runtime";
import { useActionCalendar } from "@/hooks/use-action-calendar";
import { useCalendarSurfaceQuery } from "@/hooks/use-calendar-surface-query";
import { useCapabilityDispatch } from "@/hooks/use-capability-dispatch";
import { useCopy } from "@/hooks/use-copy";
import { useFeedSlotChatMessages } from "@/hooks/use-feed-slot-chat-messages";
import { useGpsArrivalRecall } from "@/hooks/use-gps-arrival-recall";
import { useRealtimeSurfaceComposition } from "@/hooks/use-realtime-surface-composition";
import { useRelationshipFeedSlots } from "@/hooks/use-relationship-feed-slots";
import { useSurfaceActionFeedback } from "@/hooks/use-surface-action-feedback";
import { useSurfaceMemory } from "@/hooks/use-surface-memory";
import { readClientMasterOrchestratorContext } from "@/lib/action-chat/client-master-context";
import { buildSurfaceActionKey } from "@/lib/memory";
import {
  notifyPeerRoomFromFeed,
  peerRoomPath,
} from "@/lib/peer-chat/navigate-peer-room-from-feed";
import { markOpportunityConsumed } from "@/lib/predictive-dock/action-opportunity-session";
import {
  derivePrimaryErrorMessage,
  derivePrimarySuccessMessage,
} from "@/lib/surface-composition/surface-success-copy";
import { ensureFeedPlanDemoEvent } from "@/lib/feed/seed-feed-plan-demo";
import {
  ensureGermanyGoldenPathDemo,
  GERMANY_GOLDEN_QUERY,
} from "@/lib/feed/seed-germany-golden-path-demo";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import { syncDmThreadsRemote } from "@/lib/peer-chat/peer-chat-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

function bootstrapFeedDemoEvents(
  goldenPath: string | null,
  simulateArrival = true,
): void {
  if (typeof window === "undefined") {
    return;
  }
  if (goldenPath === GERMANY_GOLDEN_QUERY) {
    void ensureGermanyGoldenPathDemo({ simulateArrival });
    return;
  }
  ensureFeedPlanDemoEvent();
}

type FeedSlotShellProps = {
  className?: string;
  onOpenLinkPaste?: () => void;
};

/**
 * Feed HQ — today slots only. Avoids useActionChat (heavy orchestrator) on /feed.
 */
export function FeedSlotShell({ className, onOpenLinkPaste }: FeedSlotShellProps) {
  const copy = useCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const goldenPath = searchParams.get("golden");
  const simulateArrival = searchParams.get("simulateArrival") !== "0";
  bootstrapFeedDemoEvents(goldenPath, simulateArrival);
  const recallEventId = searchParams.get("recallEvent");
  const { recall: gpsArrivalRecall } = useGpsArrivalRecall({
    enabled: !recallEventId?.trim(),
  });
  const { slots: relationshipSlots } = useRelationshipFeedSlots(true);
  const feedSlotMessages = useFeedSlotChatMessages();
  const [peerContacts, setPeerContacts] = useState(() => readPeerContacts());
  const surfaceMemory = useSurfaceMemory();
  const masterContext = useMemo(() => readClientMasterOrchestratorContext(), []);
  const surfaceState = useRealtimeSurfaceComposition({
    dateKey: masterContext.currentDate,
    context: {
      now: new Date(),
      completedActionIds: surfaceMemory.completedActionIds,
      dismissedSurfaceIds: surfaceMemory.dismissedSurfaceIds,
    },
  });
  const surfaceFrame = surfaceState.frame;
  const { badgeCount, ...calendarForSheet } = useActionCalendar({
    messages: feedSlotMessages,
    linkIds: [],
  });
  const { dispatchAndRecord } = useCapabilityDispatch({
    sendPrompt: (text) => {
      router.push(`/search?q=${encodeURIComponent(text)}`);
    },
  });
  const surfaceFeedback = useSurfaceActionFeedback();
  const [activeActionsOpen, setActiveActionsOpen] = useState(false);
  const { clearCalendarQuery } = useCalendarSurfaceQuery({
    onOpenSheet: () => setActiveActionsOpen(true),
    onOpenFull: () => router.push("/search?calendar=full"),
  });
  const handleActiveActionsOpenChange = useCallback(
    (open: boolean) => {
      setActiveActionsOpen(open);
      if (!open && searchParams.get("calendar") === "sheet") {
        clearCalendarQuery();
      }
    },
    [clearCalendarQuery, searchParams],
  );
  const [groupRooms, setGroupRooms] = useState<
    readonly { peerThreadId: string; displayName: string }[]
  >([]);

  useEffect(() => {
    const refreshContacts = () => setPeerContacts(readPeerContacts());
    refreshContacts();
    window.addEventListener("focus", refreshContacts);
    return () => window.removeEventListener("focus", refreshContacts);
  }, []);

  useEffect(() => {
    if (!gpsArrivalRecall) {
      return;
    }
    toast.message(gpsArrivalRecall.recallLine, { duration: 4200 });
  }, [gpsArrivalRecall?.sessionKey]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }
    void syncDmThreadsRemote()
      .then((threads) =>
        setGroupRooms(
          threads
            .filter((row) => row.roomKind === "group")
            .map((row) => ({
              peerThreadId: row.threadId,
              displayName: row.displayName,
            })),
        ),
      )
      .catch(() => {});
  }, []);

  const handleSurfaceDispatch = useCallback(
    (
      node: Parameters<SurfaceCompositionRuntimeProps["onDispatchCapability"]>[0],
      _actionId: string,
      capabilityId: Parameters<SurfaceCompositionRuntimeProps["onDispatchCapability"]>[2],
    ) => {
      const actionKey = buildSurfaceActionKey(node.id, capabilityId);
      surfaceFeedback.markLoading(actionKey);
      const { result, record } = dispatchAndRecord({
        capabilityId,
        inputs: {
          title: node.title ?? "",
          destination: node.resources.find((r) => r.kind === "location")?.label ?? "",
          place: node.resources.find((r) => r.kind === "location")?.label ?? "",
        },
        metadata: {
          surfaceId: node.id,
          actionKey,
        },
      });
      if (!result.ok) {
        surfaceFeedback.markError(actionKey, derivePrimaryErrorMessage(capabilityId));
        return;
      }
      if (record?.status === "completed") {
        surfaceFeedback.markSuccess(
          actionKey,
          derivePrimarySuccessMessage(capabilityId, node),
        );
      } else if (record?.status === "failed") {
        surfaceFeedback.markError(actionKey, derivePrimaryErrorMessage(capabilityId));
      }
      if (capabilityId === "DISMISS_SURFACE") {
        markOpportunityConsumed(node.id);
      }
    },
    [dispatchAndRecord, surfaceFeedback],
  );

  return (
    <>
      <div
        data-feed-slot-shell
        className={cn(
          "action-shell action-shell--slot flex h-full min-h-0 flex-1 flex-col overflow-hidden",
          className,
        )}
      >
        <header className="shrink-0 border-b border-border bg-card/95 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-5">
          <div className="flex min-h-9 items-center justify-between gap-2">
            <RimvioLogo size="sm" className="h-7 shrink-0" appearance="dark" />
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <RelationshipFeedFolder />
              <CalendarHeaderControls
                badgeCount={badgeCount}
                onOpenSheet={() => setActiveActionsOpen(true)}
                onOpenFull={() => router.push("/search?calendar=full")}
              />
              <Link
                href="/welcome"
                aria-label="설정"
                className="flex size-8 items-center justify-center rounded-full bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 sm:size-9"
              >
                <Settings2 className="size-[1.15rem] sm:size-5" strokeWidth={2.1} />
              </Link>
            </div>
          </div>
        </header>

        <div
          data-feed-slot-bottom-stack
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        >
          <SurfaceStabilityStrip
            learningPaused={surfaceState.learningPaused}
            systemLoadLevel={surfaceState.systemLoadLevel}
          />
          <FeedSlotStage
            frame={surfaceFrame}
            overlayRows={calendarForSheet.overlayRows}
            messages={feedSlotMessages}
            relationshipSlots={relationshipSlots}
            groupRooms={groupRooms}
            peerContacts={peerContacts}
            recallEventId={recallEventId}
            gpsArrivalRecall={gpsArrivalRecall}
            peerDetailCopy={copy.feed.today.peerDetail}
            onDispatchCapability={handleSurfaceDispatch}
            onSpawnPrompt={(uri) => router.push(`/search?q=${encodeURIComponent(uri)}`)}
            onOpenCalendar={() => setActiveActionsOpen(true)}
            onLater={() => toast.message("나중에 다시 보여드릴게요", { duration: 2800 })}
            onOpenPeerChat={(peer) => {
              notifyPeerRoomFromFeed(peer.displayName);
              router.push(peerRoomPath(peer.peerThreadId));
            }}
            onScrollToFeedMessage={(messageId) => {
              router.push(`/search?scrollMsg=${encodeURIComponent(messageId)}`);
              toast.message("검색 탭에서 대화를 확인해 주세요", { duration: 2800 });
            }}
            className="min-h-0 flex-1 overflow-hidden"
          />
        </div>
      </div>

      <ActiveActionsSheet
        open={activeActionsOpen}
        onOpenChange={handleActiveActionsOpenChange}
        calendar={calendarForSheet}
        contextByMessageId={{}}
        onCancelScheduled={() => {}}
        onFireScheduledNow={() => {}}
        onScrollToMessage={() => {}}
        onCancelLinkReminder={() => {}}
        onOpenLink={() => onOpenLinkPaste?.()}
        onAddSchedule={() => {
          router.push("/search");
          toast.message("검색에서 일정을 말해 보세요");
        }}
        onOpenFullCalendar={() => router.push("/search?calendar=full")}
      />
    </>
  );
}
