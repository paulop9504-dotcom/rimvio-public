import type { EventCandidate } from "@/lib/events/event-candidate";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";
import { stampPlanContextMetadata } from "@/lib/plan-context/plan-context-metadata";

function toLocalEventIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

export function buildMomentEventDraft(input: {
  capturedAtIso: string;
  placeLabel?: string | null;
  memoText?: string | null;
}): EventCandidate {
  const capturedMs = Date.parse(input.capturedAtIso);
  const start = Number.isNaN(capturedMs) ? new Date() : new Date(capturedMs);
  const place = input.placeLabel?.trim();
  const memo = input.memoText?.trim();
  const title = place ? `${place} 순간` : memo ? memo.slice(0, 24) : "오늘 순간";
  const stamp = new Date().toISOString();

  return {
    id: `moment:${start.getTime()}`,
    title,
    category: place ? "travel" : "schedule",
    source: "message",
    lifecycle: "active",
    datetime: toLocalEventIso(start),
    place: place || undefined,
    confidence: 0.62,
    metadata: {
      autoIngested: true,
      feedPlanEnabled: false,
      targetingSource: "capture_bootstrap",
    },
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function buildPlanEventDraft(input: {
  title: string;
  place: string;
  startIso: string;
  nights: number;
  peerDisplayName?: string | null;
}): EventCandidate {
  const startMs = Date.parse(input.startIso);
  const start = Number.isNaN(startMs) ? new Date() : new Date(startMs);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(1, input.nights));
  end.setHours(20, 0, 0, 0);

  const plan: PlanContext = {
    planId: "",
    title: input.title.trim(),
    windowStartIso: toLocalEventIso(start),
    windowEndIso: toLocalEventIso(end),
    windowConfidence: "confirmed",
    nights: input.nights,
    place: input.place.trim(),
    peerDisplayName: input.peerDisplayName?.trim() || null,
    peerThreadId: null,
    attachMode: "new",
    planMode: input.peerDisplayName?.trim() ? "group" : "solo",
  };

  const stamp = new Date().toISOString();
  const id = `plan:${input.place.trim()}:${start.getTime()}`;

  return {
    id,
    title: input.title.trim(),
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime: plan.windowStartIso!,
    place: plan.place ?? undefined,
    confidence: 0.9,
    metadata: stampPlanContextMetadata(
      {
        feedPlanEnabled: true,
        planKind: "plan",
        targetingSource: "user_plan",
      },
      { ...plan, planId: id },
    ),
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
}
