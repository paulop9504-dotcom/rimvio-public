import type {
  UserDefinedAction,
  UserDefinedActionParam,
} from "@/lib/actions/user-defined-action-types";

export const USER_DEFINED_ACTIONS_KEY = "rimvio.user-defined-actions.v1";
export const USER_DEFINED_ACTIONS_UPDATED = "rimvio-user-defined-actions-updated";

const SEED_ACTION: UserDefinedAction = {
  id: "uda-btc-short",
  name: "비트코인 숏 매수",
  triggers: ["숏 매수", "숏 매수해", "숏 걸어", "비트코인 숏", "btc 숏"],
  urlTemplate:
    "exchange-app://trade?pair=BTC-USDT&side=short&action=open&amount={amount}",
  params: [{ key: "amount", label: "금액", required: false }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function readJson<T>(fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(USER_DEFINED_ACTIONS_KEY);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(value: UserDefinedAction[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(USER_DEFINED_ACTIONS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(USER_DEFINED_ACTIONS_UPDATED));
}

export function readUserDefinedActions(): UserDefinedAction[] {
  const items = readJson<UserDefinedAction[]>([]);
  if (items.length === 0 && typeof window !== "undefined") {
    writeJson([SEED_ACTION]);
    return [SEED_ACTION];
  }
  return items;
}

export function upsertUserDefinedAction(action: UserDefinedAction) {
  const current = readUserDefinedActions();
  const index = current.findIndex((item) => item.id === action.id);
  const next =
    index >= 0
      ? current.map((item, itemIndex) => (itemIndex === index ? action : item))
      : [...current, action];
  writeJson(next);
  return action;
}

export function deleteUserDefinedAction(id: string) {
  writeJson(readUserDefinedActions().filter((item) => item.id !== id));
}

export function createUserDefinedActionDraft(input: {
  name: string;
  triggers: string[];
  urlTemplate: string;
  params?: UserDefinedActionParam[];
}): UserDefinedAction {
  const now = new Date().toISOString();
  return {
    id: `uda-${crypto.randomUUID()}`,
    name: input.name.trim(),
    triggers: input.triggers.map((item) => item.trim()).filter(Boolean),
    urlTemplate: input.urlTemplate.trim(),
    params: input.params ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export function serializeUserDefinedActionsForApi() {
  return readUserDefinedActions().map((item) => ({
    id: item.id,
    name: item.name,
    triggers: item.triggers,
    urlTemplate: item.urlTemplate,
    params: item.params,
  }));
}
