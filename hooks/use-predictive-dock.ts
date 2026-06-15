"use client";

import { useEffect, useMemo, useState } from "react";
import { visibleDockActions } from "@/lib/predictive-dock/compute-predictive-dock";
import { readSurfaceMemoryContext } from "@/lib/memory";
import {
  listConsumedOpportunityIds,
  syncOpportunityIntentEpoch,
} from "@/lib/predictive-dock/action-opportunity-session";
import { resolveConversationIntent } from "@/lib/predictive-dock/resolve-conversation-intent";
import { readActiveChains } from "@/lib/containers/active-chains-state";
import { readLastGoalSnapshot } from "@/lib/goal-engine/goal-snapshot-session";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { DayScheduleTask } from "@/lib/schedule/day-schedule";
import type { PredictiveDockWire } from "@/lib/predictive-dock/types";
import { syncEventLifecycle } from "@/lib/events/event-lifecycle-runner";
import { useSurfaceEngine } from "@/hooks/use-surface-engine";
import {
  applyGoalBlendToDockWire,
  surfacesToPredictiveDockWire,
} from "@/lib/surface-engine/adapters/surface-to-dock-wire";

export function usePredictiveDock(input: {
  messages: ActionChatMessage[];
  schedule: DayScheduleTask[];
  referenceDate: string;
  chatScopeId?: string;
}) {
  const [clientReady, setClientReady] = useState(false);
  const [consumedRevision, setConsumedRevision] = useState(0);

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) {
      return;
    }
    syncEventLifecycle();
    const timer = window.setInterval(() => syncEventLifecycle(), 30_000);
    return () => window.clearInterval(timer);
  }, [clientReady]);

  useEffect(() => {
    if (!clientReady) {
      return;
    }
    const onConsumed = () => setConsumedRevision((value) => value + 1);
    window.addEventListener("rimvio:opportunity-consumed", onConsumed);
    return () => window.removeEventListener("rimvio:opportunity-consumed", onConsumed);
  }, [clientReady]);

  const lastUserMessage = useMemo(() => {
    for (let index = input.messages.length - 1; index >= 0; index -= 1) {
      if (input.messages[index]?.role === "user") {
        return input.messages[index]!.text;
      }
    }
    return null;
  }, [input.messages]);

  const activeChains = useMemo(
    () => (clientReady ? readActiveChains() : []),
    [clientReady, input.messages],
  );

  const intent = useMemo(
    () =>
      resolveConversationIntent({
        lastUserMessage,
        messages: input.messages,
        activeChains,
      }),
    [lastUserMessage, input.messages, activeChains],
  );

  useEffect(() => {
    if (!clientReady) {
      return;
    }
    syncOpportunityIntentEpoch(intent);
  }, [clientReady, intent]);

  const consumedOpportunityIds = useMemo(() => {
    if (!clientReady) {
      return [];
    }
    const memory = readSurfaceMemoryContext();
    return [
      ...new Set([
        ...listConsumedOpportunityIds(),
        ...memory.dismissedSurfaceIds,
      ]),
    ];
  }, [clientReady, intent, consumedRevision]);

  const goalSnapshot = useMemo(() => {
    if (!clientReady || !input.chatScopeId) {
      return null;
    }
    return readLastGoalSnapshot(input.chatScopeId);
  }, [clientReady, input.chatScopeId, input.messages]);

  const surfaceMemory = useMemo(
    () => (clientReady ? readSurfaceMemoryContext() : { completedActionIds: [], dismissedSurfaceIds: [] }),
    [clientReady, intent, consumedRevision],
  );

  const { feed } = useSurfaceEngine({
    dateKey: input.referenceDate,
    context: {
      dismissedSurfaceIds: consumedOpportunityIds,
      completedActionIds: surfaceMemory.completedActionIds,
      now: new Date(),
    },
  });

  const wire: PredictiveDockWire = useMemo(() => {
    if (!clientReady) {
      return { main_action: null, shadow_actions: [] };
    }
    const base = surfacesToPredictiveDockWire(feed);
    return applyGoalBlendToDockWire(base, goalSnapshot);
  }, [clientReady, feed, goalSnapshot]);

  const visible = useMemo(
    () => (clientReady ? visibleDockActions(wire) : []),
    [clientReady, wire],
  );

  return { wire, visible, intent };
}
