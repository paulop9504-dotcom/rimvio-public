import type { TemplateInstance } from "@/lib/action-template/types";

const STORAGE_KEY = "rimvio-template-instances.v1";

let memoryStore: TemplateInstance[] = [];

function readJson(): TemplateInstance[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as TemplateInstance[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(items: TemplateInstance[]) {
  if (typeof window === "undefined") {
    memoryStore = items;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
}

export function resetTemplateInstanceStoreForTests(items: TemplateInstance[] = []) {
  memoryStore = items;
  if (typeof window !== "undefined") {
    if (items.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export function saveTemplateInstance(instance: TemplateInstance): TemplateInstance {
  const current = readJson();
  const index = current.findIndex((item) => item.instance_id === instance.instance_id);
  const next =
    index >= 0
      ? current.map((item, idx) => (idx === index ? instance : item))
      : [instance, ...current];
  writeJson(next);
  return instance;
}

export function getTemplateInstance(instanceId: string): TemplateInstance | null {
  return readJson().find((item) => item.instance_id === instanceId) ?? null;
}

export function getLatestTemplateInstance(): TemplateInstance | null {
  return readJson()[0] ?? null;
}

export function toggleTemplateInstanceItem(input: {
  instanceId: string;
  itemId: string;
}): TemplateInstance | null {
  const current = readJson();
  const index = current.findIndex((item) => item.instance_id === input.instanceId);
  if (index < 0) {
    return null;
  }

  const instance = current[index]!;
  const items = instance.items.map((item) =>
    item.id === input.itemId ? { ...item, checked: !item.checked } : item
  );

  const updated: TemplateInstance = {
    ...instance,
    items,
    updatedAt: new Date().toISOString(),
  };

  const next = [...current];
  next[index] = updated;
  writeJson(next);
  return updated;
}

export function serializeTemplateInstancesForApi() {
  return readJson().slice(0, 5).map((item) => ({
    instance_id: item.instance_id,
    source_template_ids: item.source_template_ids,
    name: item.name,
    category: item.category,
    user_context: item.user_context,
    action_count: item.actions.length,
    item_count: item.items.length,
    packing_progress: {
      done: item.items.filter((entry) => entry.checked).length,
      total: item.items.length,
    },
  }));
}
