/** Context container lifecycle — archive stale buckets, suggest cleanup. */

import {
  CONTAINER_PRESETS,
  type ContainerAllowedAction,
} from "@/lib/containers/container-types";

export const CONTEXT_CONTAINERS_KEY = "rimvio.context-containers.v2";
export const CONTEXT_CONTAINERS_UPDATED = "rimvio-context-containers-updated";
export const STALE_CONTAINER_DAYS = 30;

export type ContextContainer = {
  id: string;
  title: string;
  topic?: string;
  persona?: string;
  allowedActions?: ContainerAllowedAction[];
  accent?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  archivedAt?: string | null;
};

export type ContainerMaintenanceResult = {
  archived: ContextContainer[];
  suggestions: ContextContainer[];
};

function migrateContainer(raw: Record<string, unknown>): ContextContainer | null {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return null;
  }

  const updatedAt =
    typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString();
  const createdAt =
    typeof raw.createdAt === "string" ? raw.createdAt : updatedAt;
  const lastOpenedAt =
    typeof raw.lastOpenedAt === "string" ? raw.lastOpenedAt : updatedAt;

  return {
    id: typeof raw.id === "string" ? raw.id : `ctx-${crypto.randomUUID()}`,
    title,
    topic: typeof raw.topic === "string" ? raw.topic : undefined,
    persona: typeof raw.persona === "string" ? raw.persona : undefined,
    allowedActions: Array.isArray(raw.allowedActions)
      ? (raw.allowedActions.filter(
          (entry): entry is ContainerAllowedAction => typeof entry === "string"
        ) as ContainerAllowedAction[])
      : undefined,
    accent: typeof raw.accent === "string" ? raw.accent : undefined,
    itemCount: Number(raw.itemCount ?? 1) || 1,
    createdAt,
    updatedAt,
    lastOpenedAt,
    archivedAt:
      typeof raw.archivedAt === "string" ? raw.archivedAt : raw.archivedAt === null ? null : undefined,
  };
}

function readLegacyV1(): ContextContainer[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem("rimvio.context-containers.v1");
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => migrateContainer(entry as Record<string, unknown>))
      .filter((entry): entry is ContextContainer => Boolean(entry));
  } catch {
    return [];
  }
}

function seedDefaultContainers(): ContextContainer[] {
  const now = new Date().toISOString();
  return CONTAINER_PRESETS.map((preset) => ({
    id: preset.id,
    title: preset.title,
    topic: preset.topic,
    persona: preset.persona,
    allowedActions: preset.allowedActions,
    accent: preset.accent,
    itemCount: 1,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    archivedAt: null,
  }));
}

function readRaw(): ContextContainer[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(CONTEXT_CONTAINERS_KEY);
    if (!raw) {
      const legacy = readLegacyV1();
      if (legacy.length > 0) {
        writeContextContainers(legacy);
        localStorage.removeItem("rimvio.context-containers.v1");
        return legacy;
      }

      const seeded = seedDefaultContainers();
      writeContextContainers(seeded);
      return seeded;
    }

    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => migrateContainer(entry as Record<string, unknown>))
      .filter((entry): entry is ContextContainer => Boolean(entry));
  } catch {
    return [];
  }
}

export function readContextContainers(options?: { includeArchived?: boolean }) {
  const items = readRaw().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  if (options?.includeArchived) {
    return items;
  }

  return items.filter((item) => !item.archivedAt);
}

export function writeContextContainers(containers: ContextContainer[]) {
  if (typeof window === "undefined") {
    return containers;
  }

  try {
    localStorage.setItem(CONTEXT_CONTAINERS_KEY, JSON.stringify(containers));
    window.dispatchEvent(new CustomEvent(CONTEXT_CONTAINERS_UPDATED));
  } catch {
    // ignore
  }

  return containers;
}

export function upsertContextContainer(input: {
  id?: string;
  title: string;
  topic?: string;
}): ContextContainer {
  const existing = readRaw();
  const now = new Date().toISOString();
  const match = existing.find(
    (item) =>
      item.title.trim() === input.title.trim() ||
      (input.topic && item.topic === input.topic)
  );

  if (match) {
    const next = existing.map((item) =>
      item.id === match.id
        ? {
            ...item,
            itemCount: item.itemCount + 1,
            updatedAt: now,
            lastOpenedAt: now,
            archivedAt: null,
          }
        : item
    );
    writeContextContainers(next);
    return next.find((item) => item.id === match.id)!;
  }

  const created: ContextContainer = {
    id: input.id ?? `ctx-${crypto.randomUUID()}`,
    title: input.title.trim(),
    topic: input.topic,
    itemCount: 1,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    archivedAt: null,
  };

  writeContextContainers([created, ...existing]);
  return created;
}

export function touchContextContainer(idOrTitle: string) {
  const existing = readRaw();
  const now = new Date().toISOString();
  const next = existing.map((item) => {
    if (item.id !== idOrTitle && item.title !== idOrTitle) {
      return item;
    }
    return {
      ...item,
      lastOpenedAt: now,
      archivedAt: null,
    };
  });
  writeContextContainers(next);
}

export function archiveContextContainer(id: string) {
  const now = new Date().toISOString();
  writeContextContainers(
    readRaw().map((item) =>
      item.id === id ? { ...item, archivedAt: now } : item
    )
  );
}

export function deleteContextContainer(id: string) {
  writeContextContainers(readRaw().filter((item) => item.id !== id));
}

export function restoreContextContainer(id: string) {
  writeContextContainers(
    readRaw().map((item) =>
      item.id === id ? { ...item, archivedAt: null, lastOpenedAt: new Date().toISOString() } : item
    )
  );
}

function daysSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export function evaluateContainerMaintenance(
  containers: ContextContainer[],
  now = Date.now()
): ContainerMaintenanceResult & { next: ContextContainer[] } {
  const archived: ContextContainer[] = [];
  const suggestions: ContextContainer[] = [];

  const next = containers.map((item) => {
    if (item.archivedAt) {
      return item;
    }

    const idleDays = daysSince(item.lastOpenedAt || item.updatedAt);
    if (idleDays >= STALE_CONTAINER_DAYS) {
      const stamped = { ...item, archivedAt: new Date(now).toISOString() };
      archived.push(stamped);
      return stamped;
    }

    if (idleDays >= STALE_CONTAINER_DAYS - 7) {
      suggestions.push(item);
    }

    return item;
  });

  return { next, archived, suggestions };
}

export function runContainerMaintenance(now = Date.now()): ContainerMaintenanceResult {
  const existing = readRaw();
  const { next, archived, suggestions } = evaluateContainerMaintenance(existing, now);

  if (archived.length > 0) {
    writeContextContainers(next);
  }

  return { archived, suggestions };
}

export function listArchivedContainers() {
  return readRaw().filter((item) => Boolean(item.archivedAt));
}
