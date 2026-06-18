import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  CONTEXT_GARDEN_META_KEY,
  type ContextGardenSnapshot,
  type ContextResourceGardenState,
} from "@/lib/globe/context-gardener/types";

function readResourceStates(
  value: unknown,
): Record<string, ContextResourceGardenState> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const out: Record<string, ContextResourceGardenState> = {};
  for (const [resourceId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const row = raw as Record<string, unknown>;
    const status = row.status;
    const updatedAtIso =
      typeof row.updatedAtIso === "string" ? row.updatedAtIso.trim() : "";
    if (
      (status !== "active" && status !== "done" && status !== "expired") ||
      !updatedAtIso
    ) {
      continue;
    }
    out[resourceId] = { status, updatedAtIso };
  }
  return out;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function readContextGardenSnapshot(
  event: EventCandidate | null | undefined,
): ContextGardenSnapshot | null {
  const raw = event?.metadata?.[CONTEXT_GARDEN_META_KEY];
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const summaryRaw = row.summary;
  if (!summaryRaw || typeof summaryRaw !== "object") {
    return null;
  }
  const summaryObj = summaryRaw as Record<string, unknown>;
  const headlineKo =
    typeof summaryObj.headlineKo === "string" ? summaryObj.headlineKo.trim() : "";
  if (!headlineKo) {
    return null;
  }

  const subGroupsRaw = Array.isArray(row.subGroups) ? row.subGroups : [];
  const subGroups = subGroupsRaw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const group = item as Record<string, unknown>;
      const groupId = typeof group.groupId === "string" ? group.groupId.trim() : "";
      const labelKo = typeof group.labelKo === "string" ? group.labelKo.trim() : "";
      if (!groupId || !labelKo) {
        return null;
      }
      return {
        groupId,
        labelKo,
        resourceIds: readStringArray(group.resourceIds),
        windowStartIso:
          typeof group.windowStartIso === "string" ? group.windowStartIso : null,
        windowEndIso:
          typeof group.windowEndIso === "string" ? group.windowEndIso : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const updatedAtIso = typeof row.updatedAtIso === "string" ? row.updatedAtIso : "";
  if (!updatedAtIso) {
    return null;
  }

  return {
    updatedAtIso,
    summary: {
      headlineKo,
      linesKo: readStringArray(summaryObj.linesKo),
    },
    subGroups,
    hotResourceId:
      typeof row.hotResourceId === "string" ? row.hotResourceId.trim() || null : null,
    coldResourceIds: readStringArray(row.coldResourceIds),
    archivedResourceIds: readStringArray(row.archivedResourceIds),
    resourceStates: readResourceStates(row.resourceStates),
  };
}

export function readContextGardenArchivedResourceIds(
  event: EventCandidate | null | undefined,
): readonly string[] {
  const snapshot = readContextGardenSnapshot(event);
  if (!snapshot) {
    return [];
  }
  const archived = new Set(snapshot.archivedResourceIds);
  for (const [resourceId, state] of Object.entries(snapshot.resourceStates)) {
    if (state.status === "done" || state.status === "expired") {
      archived.add(resourceId);
    }
  }
  return [...archived];
}
