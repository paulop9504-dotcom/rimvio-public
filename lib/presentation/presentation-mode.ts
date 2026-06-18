/**
 * Rimvio presentation orchestrator — 정보 유형 → 표현 방식.
 * Not every result is a card with images.
 */

export type PresentationMode =
  | "VISUAL"
  | "ACTION"
  | "TIMELINE"
  | "DASHBOARD"
  | "POLICY_REDIRECT"
  | "EXPERIENCE_CHOICE"
  | "ENTITY_QUICK_PICK"
  | "TIME_CHOICE"
  | "FLIGHT_CARD"
  | "PACKING_CHECKLIST"
  /** Conversational reply — no card chrome; maps to ACTION in derive. */
  | "conversation";

export type VisualKind = "place" | "hotel" | "travel" | "commerce";

export type PresentationWire = {
  mode: PresentationMode;
  /** Set when mode === VISUAL */
  visual_kind?: VisualKind;
};

export type PresentationSource = {
  cafeDiscovery?: unknown;
  morningBriefing?: unknown;
  transportLive?: unknown;
  scheduledDelivery?: { status?: string } | null;
  schedule?: { tasks?: unknown[] } | null;
  actions?: unknown[] | null;
  metadata?: { intent?: string } | null;
  policy?: { policy_action?: string } | null;
  experienceChoice?: { action?: string } | null;
  entityQuickPick?: unknown;
  timeChoice?: { action?: string } | null;
  flightStatusCard?: unknown;
  packingChecklist?: unknown;
  presentation?: PresentationWire | null;
};

const MODES: PresentationMode[] = [
  "VISUAL",
  "ACTION",
  "TIMELINE",
  "DASHBOARD",
  "POLICY_REDIRECT",
  "EXPERIENCE_CHOICE",
  "ENTITY_QUICK_PICK",
  "TIME_CHOICE",
  "FLIGHT_CARD",
  "PACKING_CHECKLIST",
  "conversation",
];

export function isPresentationMode(value: string): value is PresentationMode {
  return MODES.includes(value as PresentationMode);
}

/** Derive how a orchestrator result should render in chat. */
export function derivePresentationWire(source: PresentationSource): PresentationWire {
  if (
    source.policy?.policy_action &&
    source.policy.policy_action !== "PASS"
  ) {
    return { mode: "POLICY_REDIRECT" };
  }

  if (source.experienceChoice?.action === "ASK_CHOICE") {
    return { mode: "EXPERIENCE_CHOICE" };
  }

  if (source.entityQuickPick) {
    return { mode: "ENTITY_QUICK_PICK" };
  }

  if (source.timeChoice?.action === "ASK_TIME_CHOICE") {
    return { mode: "TIME_CHOICE" };
  }

  if (source.flightStatusCard) {
    return { mode: "FLIGHT_CARD" };
  }

  if (source.packingChecklist) {
    return { mode: "PACKING_CHECKLIST" };
  }

  if (source.cafeDiscovery) {
    return { mode: "VISUAL", visual_kind: "place" };
  }

  if (source.morningBriefing) {
    return { mode: "DASHBOARD" };
  }

  if (source.scheduledDelivery?.status === "pending") {
    return { mode: "TIMELINE" };
  }

  if ((source.schedule?.tasks?.length ?? 0) > 0) {
    return { mode: "TIMELINE" };
  }

  if (source.metadata?.intent === "SCHEDULE") {
    return { mode: "TIMELINE" };
  }

  if (source.transportLive) {
    return { mode: "ACTION" };
  }

  if ((source.actions?.length ?? 0) > 0) {
    return { mode: "ACTION" };
  }

  return { mode: "ACTION" };
}

export function resolvePresentationWire(source: PresentationSource): PresentationWire {
  if (source.presentation?.mode && isPresentationMode(source.presentation.mode)) {
    if (source.presentation.mode === "conversation") {
      return { mode: "ACTION" };
    }
    return source.presentation;
  }
  return derivePresentationWire(source);
}

export function shouldUseVisualGallery(wire: PresentationWire): boolean {
  return wire.mode === "VISUAL";
}

export function shouldSuppressMetaStrip(wire: PresentationWire): boolean {
  return (
    wire.mode === "VISUAL" ||
    wire.mode === "POLICY_REDIRECT" ||
    wire.mode === "EXPERIENCE_CHOICE" ||
    wire.mode === "ENTITY_QUICK_PICK" ||
    wire.mode === "TIME_CHOICE" ||
    wire.mode === "FLIGHT_CARD" ||
    wire.mode === "PACKING_CHECKLIST"
  );
}
