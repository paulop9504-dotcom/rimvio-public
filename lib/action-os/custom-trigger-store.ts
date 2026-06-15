import {
  createUserDefinedActionDraft,
  upsertUserDefinedAction,
} from "@/lib/actions/user-defined-action-store";
import { dispatchActionById } from "@/lib/action-dispatcher/dispatch-action";
import { upsertLearningTemplate } from "@/lib/action-registry/action-registry-store";
import type { CustomTriggerRecord, RegisterActionWire } from "@/lib/action-os/types";

const STORAGE_KEY = "rimvio-custom-triggers.v1";

let memoryStore: CustomTriggerRecord[] = [];

function readJson(): CustomTriggerRecord[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as CustomTriggerRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(items: CustomTriggerRecord[]) {
  if (typeof window === "undefined") {
    memoryStore = items;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}

export function resetCustomTriggerStoreForTests(items: CustomTriggerRecord[] = []) {
  memoryStore = items;
  if (typeof window !== "undefined") {
    if (items.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

function triggerTokens(pattern: string): string[] {
  const base = pattern.trim();
  return [base, ...base.split(/\s+/u).filter((part) => part.length >= 2)].slice(0, 8);
}

function resolveTriggerUrlTemplate(wire: RegisterActionWire): string {
  const schema = wire.action_schema;
  if (schema.type === "ACTION_ID" && schema.action_id) {
    const dispatched = dispatchActionById(
      schema.action_id,
      schema.params ?? {},
      "https://map.naver.com"
    );
    return dispatched.url;
  }
  return schema.uri?.trim() ?? "";
}

/** Persist REGISTER_ACTION to DB + user-defined actions + learning registry. */
export function commitRegisterAction(wire: RegisterActionWire): CustomTriggerRecord {
  const now = new Date().toISOString();
  const urlTemplate = resolveTriggerUrlTemplate(wire);
  const record: CustomTriggerRecord = {
    id: `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    trigger_pattern: wire.trigger_pattern,
    action_schema: wire.action_schema,
    createdAt: now,
    updatedAt: now,
  };

  const current = readJson();
  writeJson([record, ...current.filter((item) => item.trigger_pattern !== wire.trigger_pattern)]);

  upsertUserDefinedAction(
    createUserDefinedActionDraft({
      name: wire.action_schema.label,
      triggers: triggerTokens(wire.trigger_pattern),
      urlTemplate,
    })
  );

  upsertLearningTemplate({
    contextKey: wire.trigger_pattern,
    category: "Generic",
    scenario: "custom_trigger",
    main_action: {
      type: wire.action_schema.type,
      label: wire.action_schema.label,
      prompt: urlTemplate,
      priority: 95,
    },
    shadow_actions: [],
  });

  return record;
}

export function listCustomTriggers(): CustomTriggerRecord[] {
  return readJson();
}

export function serializeCustomTriggersForApi() {
  return readJson().slice(0, 10).map((item) => ({
    id: item.id,
    trigger_pattern: item.trigger_pattern,
    action_schema: item.action_schema,
  }));
}
