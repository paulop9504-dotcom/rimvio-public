import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  PlanAttachMode,
  PlanContext,
  PlanMode,
  PlanWindowConfidence,
} from "@/lib/plan-context/plan-context-types";

const PLAN_META_KEYS = {
  windowEndIso: "planWindowEndIso",
  windowConfidence: "planWindowConfidence",
  nights: "planNights",
  peerDisplayName: "planPeerDisplayName",
  peerThreadId: "planPeerThreadId",
  attachMode: "planAttachMode",
  planMode: "planMode",
} as const;

export function readPlanContextFromEvent(event: EventCandidate): PlanContext | null {
  const meta = event.metadata ?? {};
  const feedPlan =
    meta.feedPlanEnabled === true || meta.planKind === "plan" || event.lifecycle === "active";
  if (!feedPlan && !meta.planWindowEndIso) {
    return null;
  }

  const windowConfidence = meta.planWindowConfidence as PlanWindowConfidence | undefined;

  return {
    planId: event.id,
    title: event.title,
    windowStartIso: event.datetime,
    windowEndIso:
      typeof meta.planWindowEndIso === "string" ? meta.planWindowEndIso : null,
    windowConfidence: windowConfidence ?? (meta.planWindowEndIso ? "confirmed" : "open"),
    nights: typeof meta.planNights === "number" ? meta.planNights : undefined,
    place: event.place ?? null,
    peerDisplayName:
      typeof meta.planPeerDisplayName === "string"
        ? meta.planPeerDisplayName
        : typeof meta.peerDisplayName === "string"
          ? meta.peerDisplayName
          : null,
    peerThreadId:
      typeof meta.planPeerThreadId === "string" ? meta.planPeerThreadId : null,
    attachMode: (meta.planAttachMode as PlanAttachMode | undefined) ?? "new",
    planMode:
      (meta.planMode as PlanMode | undefined) ??
      (meta.planPeerDisplayName || meta.peerDisplayName ? "group" : "solo"),
  };
}

export function stampPlanContextMetadata(
  base: Record<string, unknown> | undefined,
  plan: PlanContext,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...base };
  if (plan.windowEndIso) {
    next[PLAN_META_KEYS.windowEndIso] = plan.windowEndIso;
  } else if (plan.windowConfidence === "open") {
    delete next[PLAN_META_KEYS.windowEndIso];
  }
  next[PLAN_META_KEYS.windowConfidence] = plan.windowConfidence;
  if (plan.nights) {
    next[PLAN_META_KEYS.nights] = plan.nights;
  }
  if (plan.peerDisplayName?.trim()) {
    next[PLAN_META_KEYS.peerDisplayName] = plan.peerDisplayName.trim();
  }
  if (plan.peerThreadId?.trim()) {
    next[PLAN_META_KEYS.peerThreadId] = plan.peerThreadId.trim();
  }
  next[PLAN_META_KEYS.attachMode] = plan.attachMode;
  if (plan.planMode) {
    next[PLAN_META_KEYS.planMode] = plan.planMode;
  }
  if (plan.planId?.trim()) {
    next.experienceVolumeId = `ev:${plan.planId.trim()}`;
  }
  return next;
}

export function isOpenPlanEvent(event: EventCandidate): boolean {
  if (event.lifecycle === "completed" || event.lifecycle === "archived") {
    return false;
  }
  const meta = event.metadata ?? {};
  return (
    meta.feedPlanEnabled === true ||
    meta.planKind === "plan" ||
    event.lifecycle === "active" ||
    Boolean(meta.planWindowEndIso)
  );
}
