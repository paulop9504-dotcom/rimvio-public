import { EVENT_KERNEL_SCHEMA_LOCK_VERSION } from "@/lib/event-kernel/schema-lock/version";

/** Life-state event (SSOT) — frozen field set. */
export const LOCKED_EVENT_SCHEMA_VERSION = "event-candidate.v1" as const;

export const LOCKED_EVENT_CATEGORIES = [
  "schedule",
  "travel",
  "finance",
  "food",
  "work",
  "social",
  "custom",
] as const;

export const LOCKED_EVENT_SOURCES = ["message", "notification", "system"] as const;

export const LOCKED_EVENT_LIFECYCLES = [
  "mentioned",
  "candidate",
  "confirmed",
  "scheduled",
  "active",
  "completed",
  "archived",
] as const;

export type LockedEventCategory = (typeof LOCKED_EVENT_CATEGORIES)[number];
export type LockedEventSource = (typeof LOCKED_EVENT_SOURCES)[number];
export type LockedEventLifecycle = (typeof LOCKED_EVENT_LIFECYCLES)[number];

/** Canonical record keys (wire uses snake_case aliases). */
export const LOCKED_EVENT_CANONICAL_KEYS = [
  "id",
  "title",
  "category",
  "source",
  "lifecycle",
  "datetime",
  "place",
  "containerId",
  "confidence",
  "metadata",
  "lifecycleUpdatedAt",
  "createdAt",
  "updatedAt",
] as const;

export const LOCKED_EVENT_WIRE_KEYS = [
  "id",
  "title",
  "category",
  "source",
  "lifecycle",
  "datetime",
  "place",
  "container_id",
  "confidence",
  "metadata",
  "lifecycle_updated_at",
] as const;

const categorySet = new Set<string>(LOCKED_EVENT_CATEGORIES);
const sourceSet = new Set<string>(LOCKED_EVENT_SOURCES);
const lifecycleSet = new Set<string>(LOCKED_EVENT_LIFECYCLES);

export type EventSchemaValidationIssue = {
  code: string;
  path?: string;
};

export function validateLockedEventCategory(
  value: unknown,
): EventSchemaValidationIssue[] {
  if (typeof value !== "string" || !categorySet.has(value)) {
    return [{ code: "invalid_category", path: "category" }];
  }
  return [];
}

export function validateLockedEventLifecycle(
  value: unknown,
): EventSchemaValidationIssue[] {
  if (typeof value !== "string" || !lifecycleSet.has(value)) {
    return [{ code: "invalid_lifecycle", path: "lifecycle" }];
  }
  return [];
}

export function validateEventCandidateWire(
  wire: unknown,
): EventSchemaValidationIssue[] {
  const issues: EventSchemaValidationIssue[] = [];
  if (!wire || typeof wire !== "object") {
    return [{ code: "wire_not_object" }];
  }
  const row = wire as Record<string, unknown>;
  if (typeof row.title !== "string" || !row.title.trim()) {
    issues.push({ code: "missing_title", path: "title" });
  }
  issues.push(...validateLockedEventCategory(row.category));
  if (typeof row.source === "string") {
    if (!sourceSet.has(row.source)) {
      issues.push({ code: "invalid_source", path: "source" });
    }
  }
  issues.push(...validateLockedEventLifecycle(row.lifecycle));
  if (row.confidence != null) {
    const c = Number(row.confidence);
    if (Number.isNaN(c) || c < 0 || c > 1) {
      issues.push({ code: "invalid_confidence", path: "confidence" });
    }
  }
  if (row.datetime != null && typeof row.datetime !== "string") {
    issues.push({ code: "invalid_datetime", path: "datetime" });
  }
  if (row.metadata != null && (typeof row.metadata !== "object" || Array.isArray(row.metadata))) {
    issues.push({ code: "invalid_metadata", path: "metadata" });
  }
  return issues;
}

export function assertValidEventCandidateWire(wire: unknown): void {
  const issues = validateEventCandidateWire(wire);
  if (issues.length > 0) {
    throw new Error(
      `[schema-lock:${EVENT_KERNEL_SCHEMA_LOCK_VERSION}] event wire invalid: ${issues.map((i) => i.code).join(",")}`,
    );
  }
}

export function eventSchemaLockMeta() {
  return {
    schemaLockVersion: EVENT_KERNEL_SCHEMA_LOCK_VERSION,
    eventSchemaVersion: LOCKED_EVENT_SCHEMA_VERSION,
    categories: LOCKED_EVENT_CATEGORIES,
    lifecycles: LOCKED_EVENT_LIFECYCLES,
  };
}
