import type { ActionIntentWire } from "@/lib/action-dispatcher/types";

export type SessionIntentState = {
  action_id: string;
  params: Record<string, string>;
  fallback_url: string;
  thought?: string;
  updatedAt: string;
};

const STORAGE_KEY = "rimvio-session-intent.v1";
const DEFAULT_SCOPE = "default";

let memoryByScope = new Map<string, SessionIntentState>();

function readScope(scopeId: string): SessionIntentState | null {
  if (typeof window === "undefined") {
    return memoryByScope.get(scopeId) ?? null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Record<string, SessionIntentState>;
    return parsed[scopeId] ?? null;
  } catch {
    return memoryByScope.get(scopeId) ?? null;
  }
}

function writeScope(scopeId: string, state: SessionIntentState | null) {
  if (typeof window === "undefined") {
    if (state) {
      memoryByScope.set(scopeId, state);
    } else {
      memoryByScope.delete(scopeId);
    }
    return;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, SessionIntentState>) : {};
    if (state) {
      parsed[scopeId] = state;
    } else {
      delete parsed[scopeId];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    if (state) {
      memoryByScope.set(scopeId, state);
    } else {
      memoryByScope.delete(scopeId);
    }
  }
}

export function resetSessionIntentStoreForTests(scopeId = DEFAULT_SCOPE) {
  memoryByScope = new Map();
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  writeScope(scopeId, null);
}

export function getSessionIntent(scopeId = DEFAULT_SCOPE): SessionIntentState | null {
  return readScope(scopeId);
}

export function commitSessionIntent(
  wire: Pick<ActionIntentWire, "action_id" | "params" | "fallback_url" | "thought">,
  scopeId = DEFAULT_SCOPE
): SessionIntentState {
  const record: SessionIntentState = {
    action_id: wire.action_id,
    params: { ...wire.params },
    fallback_url: wire.fallback_url,
    thought: wire.thought,
    updatedAt: new Date().toISOString(),
  };
  writeScope(scopeId, record);
  return record;
}

export function clearSessionIntent(scopeId = DEFAULT_SCOPE) {
  writeScope(scopeId, null);
}

const CORRECTION_PREFIX =
  /^(?:아니야|아니|말고|대신|그게\s*아니|잘못|정정|취소(?:하고)?|actually,?\s*no|no,?\s*)/iu;

export function isCorrectionMessage(message: string): boolean {
  return CORRECTION_PREFIX.test(message.trim());
}

/** Strip trailing Korean particle suffixes from correction targets. */
function normalizeCorrectionTarget(raw: string): string {
  return raw
    .replace(/^(?:은|는|이|가)\s+/u, "")
    .replace(/\s*(?:으로|로)\s*$/u, "")
    .trim();
}

/** Extract corrected destination/target from user correction utterance. */
export function extractCorrectionTarget(message: string): string | null {
  const trimmed = message.trim();
  const patterns = [
    /(?:아니야|아니|말고|대신|그게\s*아니|잘못|정정|no,?\s*)\s*(?:은|는|이|가)?\s*(.+?)(?:\s*(?:으로|로)\s*(?:가|해|해줘|갈|가자))?[!.~]*$/iu,
    /(?:대신|말고)\s*(.+?)(?:\s*(?:으로|로))?[!.~]*$/iu,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(trimmed);
    const value = match?.[1]?.trim();
    if (value && value.length >= 2) {
      const normalized = normalizeCorrectionTarget(value);
      return normalized.length >= 2 ? normalized : null;
    }
  }

  return null;
}

export function applySessionIntentCorrection(input: {
  message: string;
  previous: SessionIntentState | null;
  paramKey?: "dest" | "destination" | "query";
}): SessionIntentState | null {
  if (!input.previous || !isCorrectionMessage(input.message)) {
    return null;
  }

  const target = extractCorrectionTarget(input.message);
  if (!target) {
    return null;
  }

  const key = input.paramKey ?? "dest";
  const next: SessionIntentState = {
    ...input.previous,
    params: {
      ...input.previous.params,
      [key]: target,
    },
    thought: `Correction applied — discarded prior ${key}, replaced with '${target}'.`,
    updatedAt: new Date().toISOString(),
  };

  return next;
}

export function sessionIntentToActionIntent(state: SessionIntentState): ActionIntentWire {
  return {
    action_id: state.action_id,
    params: state.params,
    fallback_url: state.fallback_url,
    thought: state.thought,
  };
}

export function sessionIntentToDockJson(state: SessionIntentState): Record<string, unknown> {
  return {
    thought: state.thought,
    strategy: "DYNAMIC_INFERENCE",
    main_action: {
      label: state.params.dest ?? state.params.destination ?? state.params.query ?? "실행",
      execution: {
        action_id: state.action_id,
        params: state.params,
      },
    },
    shadow_actions: [],
  };
}
