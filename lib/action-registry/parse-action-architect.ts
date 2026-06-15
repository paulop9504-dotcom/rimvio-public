import type { ActionArchitectWire } from "@/lib/action-registry/types";
import type { MasterOrchestratorWire } from "@/lib/action-chat/orchestrator-types";
import { architectWireToDockWire } from "@/lib/action-registry/match-template";
import { visibleDockActions } from "@/lib/predictive-dock/compute-predictive-dock";

function normalizeShadowAction(raw: unknown): ActionArchitectWire["shadow_actions"][number] | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type.trim() : "";
  const label = typeof record.label === "string" ? record.label.trim() : "";
  const score =
    typeof record.score === "number"
      ? record.score
      : typeof record.priority === "number"
        ? record.priority
        : 70;
  const prompt = typeof record.prompt === "string" ? record.prompt : label;
  if (!type || !label) {
    return null;
  }
  return { type, label, score, prompt };
}

function normalizeMainAction(raw: unknown): ActionArchitectWire["main_action"] {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type.trim() : "";
  const label = typeof record.label === "string" ? record.label.trim() : "";
  const priority =
    typeof record.priority === "number"
      ? record.priority
      : typeof record.score === "number"
        ? record.score
        : 90;
  const prompt = typeof record.prompt === "string" ? record.prompt : label;
  if (!type || !label) {
    return null;
  }
  return { type, label, priority, prompt };
}

const STRATEGIES = new Set(["MANUAL_CORE", "DYNAMIC_INFERENCE", "LEARNED_TEMPLATE"]);

export function parseActionArchitectWire(
  raw: Record<string, unknown>
): ActionArchitectWire | null {
  if (raw.action === "REGISTER_ACTION") {
    return null;
  }

  const metaIntent =
    raw.meta && typeof raw.meta === "object"
      ? (raw.meta as { intent?: string }).intent
      : undefined;
  if (
    metaIntent === "CONFIRM" ||
    metaIntent === "WITTY" ||
    raw.confirm_message ||
    raw.confirm_data
  ) {
    return null;
  }

  const main_action = normalizeMainAction(raw.main_action);
  const strategyRaw =
    typeof raw.strategy_applied === "string" ? raw.strategy_applied.trim() : "";
  const hasExplicitStrategy = STRATEGIES.has(strategyRaw);

  if (!main_action && !hasExplicitStrategy) {
    return null;
  }

  const message =
    typeof raw.message === "string"
      ? raw.message.trim()
      : typeof raw.summary === "string"
        ? raw.summary.trim()
        : "";
  if (!message) {
    return null;
  }

  const strategy_applied = hasExplicitStrategy
    ? (strategyRaw as ActionArchitectWire["strategy_applied"])
    : "DYNAMIC_INFERENCE";

  const shadowRaw = raw.shadow_actions ?? raw.auxiliary_actions;
  const shadow_actions = Array.isArray(shadowRaw)
    ? shadowRaw
        .map((item) => normalizeShadowAction(item))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  return {
    thought:
      typeof raw.thought === "string"
        ? raw.thought
        : `ActionArchitect · ${strategy_applied}`,
    strategy_applied,
    template_id:
      typeof raw.template_id === "string" && raw.template_id.trim()
        ? raw.template_id.trim()
        : null,
    message,
    main_action,
    shadow_actions,
  };
}

export function actionArchitectToMasterWire(wire: ActionArchitectWire): MasterOrchestratorWire {
  const dock = architectWireToDockWire(wire);
  const actions = visibleDockActions(dock).map((item, index) => ({
    label: item.label,
    icon: index === 0 ? "check" : "link",
    action_type: "DEEP_LINK" as const,
    url: `rimvio://global-brain/${encodeURIComponent(item.type)}?label=${encodeURIComponent(item.label)}&template=${encodeURIComponent(wire.template_id ?? "")}`,
  }));

  return {
    summary: wire.message,
    actions: actions.slice(0, 4),
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
    },
  };
}
