import type { EventCandidate } from "@/lib/events/event-candidate";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

function lifecycleRank(lifecycle: EventCandidate["lifecycle"]): number {
  if (lifecycle === "active") {
    return 4;
  }
  if (lifecycle === "scheduled") {
    return 3;
  }
  if (lifecycle === "completed") {
    return 2;
  }
  return 1;
}

/** Pure read — active/scheduled plan tied to a ROOM thread id. */
export function findPlanEventForPeerThread(
  events: readonly EventCandidate[],
  peerThreadId: string,
): EventCandidate | null {
  const threadId = peerThreadId.trim();
  if (!threadId) {
    return null;
  }

  const matches = events.filter((event) => {
    if (event.lifecycle === "archived") {
      return false;
    }
    const plan = readPlanContextFromEvent(event);
    return Boolean(plan?.peerThreadId?.trim() === threadId);
  });

  if (matches.length === 0) {
    return null;
  }

  return [...matches].sort(
    (left, right) => lifecycleRank(right.lifecycle) - lifecycleRank(left.lifecycle),
  )[0]!;
}

/** Plan event when capture time falls inside the trip window. */
export function findPlanEventForPeerThreadAt(
  events: readonly EventCandidate[],
  input: { peerThreadId: string; capturedAtIso: string },
): EventCandidate | null {
  const planEvent = findPlanEventForPeerThread(events, input.peerThreadId);
  if (!planEvent) {
    return null;
  }

  const plan = readPlanContextFromEvent(planEvent);
  const capMs = parseIsoMs(input.capturedAtIso);
  const startMs = parseIsoMs(plan?.windowStartIso ?? planEvent.datetime);
  const endMs = parseIsoMs(plan?.windowEndIso ?? null);
  if (capMs === null || startMs === null) {
    return planEvent;
  }

  const endBound = endMs ?? startMs + 14 * 86_400_000;
  if (capMs >= startMs - 86_400_000 && capMs <= endBound + 86_400_000) {
    return planEvent;
  }

  return planEvent;
}
