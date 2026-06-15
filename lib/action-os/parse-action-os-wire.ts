import type {
  DockActionWire,
  DockUpdateWire,
  RegisterActionWire,
} from "@/lib/action-os/types";

function normalizeParams(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

function normalizeExecution(raw: unknown): DockActionWire["execution"] | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;

  const action_id =
    typeof record.action_id === "string"
      ? record.action_id.trim()
      : typeof record.actionId === "string"
        ? record.actionId.trim()
        : "";

  if (action_id) {
    return {
      type: "ACTION_ID",
      uri: "",
      action_id,
      params: normalizeParams(record.params),
    } as DockActionWire["execution"] & { action_id: string; params: Record<string, string> };
  }

  const type = typeof record.type === "string" ? record.type.trim() : "";
  const uri =
    typeof record.uri === "string"
      ? record.uri.trim()
      : typeof record.url === "string"
        ? record.url.trim()
        : "";
  if (!type || !uri) {
    return null;
  }
  return { type, uri };
}

function normalizeDockAction(raw: unknown): DockActionWire | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const label = typeof record.label === "string" ? record.label.trim() : "";
  const execution = normalizeExecution(record.execution ?? record);
  if (!label || !execution) {
    const type = typeof record.type === "string" ? record.type.trim() : "";
    const prompt = typeof record.prompt === "string" ? record.prompt.trim() : label;
    if (label && type) {
      return {
        label,
        execution: { type, uri: prompt || label },
        lifecycle: record.lifecycle === "ACTIVE" ? "ACTIVE" : "WARM",
      };
    }
    return null;
  }
  const lifecycleRaw = record.lifecycle;
  const lifecycle =
    lifecycleRaw === "ACTIVE" || lifecycleRaw === "ARCHIVED" || lifecycleRaw === "WARM"
      ? lifecycleRaw
      : undefined;
  return { label, execution, lifecycle };
}

export function parseRegisterActionWire(
  raw: Record<string, unknown>
): RegisterActionWire | null {
  if (raw.action !== "REGISTER_ACTION") {
    return null;
  }
  const trigger_pattern =
    typeof raw.trigger_pattern === "string" ? raw.trigger_pattern.trim() : "";
  const schemaRaw = raw.action_schema;
  if (!trigger_pattern || !schemaRaw || typeof schemaRaw !== "object") {
    return null;
  }
  const schema = schemaRaw as Record<string, unknown>;
  const label = typeof schema.label === "string" ? schema.label.trim() : "";
  const typeRaw = typeof schema.type === "string" ? schema.type.trim().toUpperCase() : "ACTION_ID";
  const type =
    typeRaw === "API" || typeRaw === "UI" || typeRaw === "DEEP_LINK" || typeRaw === "ACTION_ID"
      ? typeRaw
      : "ACTION_ID";

  const action_id =
    typeof schema.action_id === "string"
      ? schema.action_id.trim()
      : typeof schema.actionId === "string"
        ? schema.actionId.trim()
        : "";

  const uri = typeof schema.uri === "string" ? schema.uri.trim() : "";

  if (!label) {
    return null;
  }

  if (type === "ACTION_ID") {
    if (!action_id) {
      return null;
    }
    return {
      action: "REGISTER_ACTION",
      trigger_pattern,
      action_schema: {
        type: "ACTION_ID",
        action_id,
        label,
        params: normalizeParams(schema.params),
      },
    };
  }

  if (!uri) {
    return null;
  }

  return {
    action: "REGISTER_ACTION",
    trigger_pattern,
    action_schema: { type, uri, label },
  };
}

const STRATEGIES = new Set(["MANUAL_CORE", "LEARNED_TEMPLATE", "DYNAMIC_INFERENCE"]);

export function parseDockUpdateWire(raw: Record<string, unknown>): DockUpdateWire | null {
  if (raw.action === "REGISTER_ACTION") {
    return null;
  }

  const main = normalizeDockAction(raw.main_action);
  if (!main) {
    return null;
  }

  const shadowRaw = raw.shadow_actions ?? raw.auxiliary_actions;
  const shadow_actions = Array.isArray(shadowRaw)
    ? shadowRaw
        .map((item) => normalizeDockAction(item))
        .filter((item): item is DockActionWire => Boolean(item))
        .slice(0, 4)
    : [];

  const strategyRaw =
    typeof raw.strategy === "string"
      ? raw.strategy.trim()
      : typeof raw.strategy_applied === "string"
        ? raw.strategy_applied.trim()
        : "DYNAMIC_INFERENCE";

  return {
    thought: typeof raw.thought === "string" ? raw.thought : undefined,
    strategy: STRATEGIES.has(strategyRaw)
      ? (strategyRaw as DockUpdateWire["strategy"])
      : "DYNAMIC_INFERENCE",
    main_action: main,
    shadow_actions,
  };
}

/** Detect NL trigger programming before LLM (fallback). */
function stripQuotes(value: string): string {
  return value.replace(/^['"「『]+|['"」』]+$/gu, "").trim();
}

export function parseNaturalLanguageTrigger(message: string): RegisterActionWire | null {
  const trimmed = message.trim();
  const match =
    /앞으로\s+(.+?)\s+(?:하면|할\s*때|이면|\S+면|(?:라고\s*)?(?:말|말하)(?:하면|하면))\s+(.+?)(?:\s*(?:띄워|켜|열|실행))?(?:\s*줘)?(?:[!?.~ㅋㅎ\s]*)$/iu.exec(
      trimmed
    );
  if (!match) {
    return null;
  }
  const trigger_pattern = stripQuotes(match[1]!.trim());
  const actionLabel = stripQuotes(match[2]!.trim());
  const action_id = /유튜브|youtube|뮤직|music/iu.test(actionLabel)
    ? "YOUTUBE_OPEN"
    : undefined;

  return {
    action: "REGISTER_ACTION",
    trigger_pattern,
    action_schema: action_id
      ? {
          type: "ACTION_ID",
          action_id,
          label: actionLabel,
        }
      : {
          type: "DEEP_LINK",
          uri: `rimvio://custom-trigger/${encodeURIComponent(trigger_pattern)}`,
          label: actionLabel,
        },
  };
}
