import type {
  ActionRegistryEntry,
  ActionTemplateStatus,
} from "@/lib/action-registry/types";

const STORAGE_KEY = "rimvio-action-registry.v1";
const PROMOTION_THRESHOLD = 3;

let memoryStore: ActionRegistryEntry[] = [];

function readJson(): ActionRegistryEntry[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ActionRegistryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(items: ActionRegistryEntry[]) {
  if (typeof window === "undefined") {
    memoryStore = items;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function resetActionRegistryForTests(items: ActionRegistryEntry[] = []) {
  memoryStore = items;
  if (typeof window !== "undefined") {
    if (items.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export function listLearnedRegistryEntries(): ActionRegistryEntry[] {
  return readJson();
}

export function listPromotedTemplates(): ActionRegistryEntry[] {
  return readJson().filter((item) => item.template_status === "PROMOTED");
}

/** Promote LEARNING → PROMOTED when usage_count >= threshold. */
export function runTemplatePromotionPass(): ActionRegistryEntry[] {
  const current = readJson();
  let changed = false;
  const next = current.map((item) => {
    if (
      item.template_status === "LEARNING" &&
      item.usage_count >= PROMOTION_THRESHOLD
    ) {
      changed = true;
      return {
        ...item,
        template_status: "PROMOTED" as ActionTemplateStatus,
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });
  if (changed) {
    writeJson(next);
  }
  return next;
}

function slugContextKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function upsertLearningTemplate(input: {
  contextKey: string;
  category: ActionRegistryEntry["category"];
  scenario: string;
  main_action: ActionRegistryEntry["main_action"];
  shadow_actions: ActionRegistryEntry["shadow_actions"];
}): ActionRegistryEntry {
  runTemplatePromotionPass();
  const key = slugContextKey(input.contextKey);
  const now = new Date().toISOString();
  const current = readJson();
  const existing = current.find((item) => item.contextKey === key);

  if (existing) {
    const updated: ActionRegistryEntry = {
      ...existing,
      main_action: input.main_action,
      shadow_actions: input.shadow_actions,
      updatedAt: now,
    };
    writeJson(current.map((item) => (item.id === existing.id ? updated : item)));
    return updated;
  }

  const record: ActionRegistryEntry = {
    id: `learned-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    contextKey: key,
    category: input.category,
    scenario: input.scenario,
    template_status: "LEARNING",
    strategy_source: "DYNAMIC_INFERENCE",
    usage_count: 0,
    main_action: input.main_action,
    shadow_actions: input.shadow_actions,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
  };

  writeJson([...current, record]);
  return record;
}

export function recordTemplateUsage(templateId: string): ActionRegistryEntry | null {
  const current = readJson();
  const index = current.findIndex((item) => item.id === templateId);
  if (index < 0) {
    return null;
  }

  const now = new Date().toISOString();
  const updated: ActionRegistryEntry = {
    ...current[index]!,
    usage_count: current[index]!.usage_count + 1,
    lastUsedAt: now,
    updatedAt: now,
  };

  const next = [...current];
  next[index] = updated;
  writeJson(next);
  runTemplatePromotionPass();
  return updated;
}

export function serializePromotedTemplatesForApi() {
  runTemplatePromotionPass();
  return listPromotedTemplates().map((item) => ({
    id: item.id,
    context_key: item.contextKey,
    category: item.category,
    scenario: item.scenario,
    usage_count: item.usage_count,
    main_action: item.main_action,
    shadow_actions: item.shadow_actions,
  }));
}

export function promotedApiWireToEntries(
  items?: Array<{
    id: string;
    context_key: string;
    category: ActionRegistryEntry["category"];
    scenario: string;
    usage_count: number;
    main_action: ActionRegistryEntry["main_action"];
    shadow_actions: ActionRegistryEntry["shadow_actions"];
  }>
): ActionRegistryEntry[] {
  if (!items?.length) {
    return [];
  }
  const now = new Date().toISOString();
  return items.map((item) => ({
    id: item.id,
    contextKey: item.context_key,
    category: item.category,
    scenario: item.scenario,
    template_status: "PROMOTED" as ActionTemplateStatus,
    strategy_source: "LEARNED_TEMPLATE" as const,
    usage_count: item.usage_count,
    main_action: item.main_action,
    shadow_actions: item.shadow_actions,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
  }));
}
