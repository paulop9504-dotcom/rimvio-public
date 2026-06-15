import type {
  MasterOrchestratorWire,
  OrchestratorActionWire,
  OrchestratorMetadataWire,
} from "@/lib/action-chat/orchestrator-types";

export type GlobalBrainActionWire = {
  label: string;
  action: string;
};

export type GlobalBrainAnalysisWire = {
  category: string;
  status_change?: string | null;
  event_conflict?: boolean;
};

export type GlobalBrainActionableWire = {
  thought: string;
  analysis: GlobalBrainAnalysisWire;
  message: string;
  main_action?: GlobalBrainActionWire | null;
  auxiliary_actions?: GlobalBrainActionWire[];
};

const VALID_CATEGORIES = new Set(["Apex", "Haven", "Nexus", "Sentinel", "Chat"]);

function normalizeAction(raw: unknown): GlobalBrainActionWire | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const label = typeof record.label === "string" ? record.label.trim() : "";
  const action = typeof record.action === "string" ? record.action.trim() : "";
  if (!label || !action) {
    return null;
  }
  return { label, action };
}

function normalizeCategory(raw: unknown): string {
  if (typeof raw !== "string") {
    return "Chat";
  }
  const cleaned = raw.replace(/^\[|\]$/g, "").trim();
  if (VALID_CATEGORIES.has(cleaned)) {
    return cleaned;
  }
  return "Chat";
}

export function parseGlobalBrainActionableWire(
  raw: Record<string, unknown>
): GlobalBrainActionableWire | null {
  const message = typeof raw.message === "string" ? raw.message.trim() : "";
  const thought = typeof raw.thought === "string" ? raw.thought.trim() : "";
  if (!message) {
    return null;
  }

  const analysisRaw =
    raw.analysis && typeof raw.analysis === "object"
      ? (raw.analysis as Record<string, unknown>)
      : {};

  const main_action = normalizeAction(raw.main_action);
  const auxiliary_actions = Array.isArray(raw.auxiliary_actions)
    ? raw.auxiliary_actions
        .map((item) => normalizeAction(item))
        .filter((item): item is GlobalBrainActionWire => Boolean(item))
    : [];

  return {
    thought: thought || "GlobalBrain · actionable output",
    analysis: {
      category: normalizeCategory(analysisRaw.category),
      status_change:
        typeof analysisRaw.status_change === "string"
          ? analysisRaw.status_change
          : null,
      event_conflict: analysisRaw.event_conflict === true,
    },
    message,
    main_action,
    auxiliary_actions,
  };
}

function brainActionToOrchestratorAction(
  item: GlobalBrainActionWire,
  primary: boolean
): OrchestratorActionWire {
  return {
    label: item.label,
    icon: primary ? "check" : "link",
    action_type: "DEEP_LINK",
    url: `rimvio://global-brain/${encodeURIComponent(item.action)}?label=${encodeURIComponent(item.label)}`,
  };
}

function categoryToIntent(category: string): OrchestratorMetadataWire["intent"] {
  if (category === "Chat") {
    return "CONVERSATION";
  }
  return "ACTION";
}

/** Map Global Brain JSON → existing Master orchestrator wire (UI buttons). */
export function globalBrainActionableToMasterWire(
  wire: GlobalBrainActionableWire
): MasterOrchestratorWire {
  const actions: OrchestratorActionWire[] = [];

  if (wire.main_action) {
    actions.push(brainActionToOrchestratorAction(wire.main_action, true));
  }

  for (const item of wire.auxiliary_actions ?? []) {
    actions.push(brainActionToOrchestratorAction(item, false));
  }

  return {
    summary: wire.message,
    thought: wire.thought,
    actions: actions.slice(0, 4),
    metadata: {
      intent: categoryToIntent(wire.analysis.category),
      trust_level_adjustment: "NONE",
    },
  };
}
