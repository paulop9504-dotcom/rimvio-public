/** Light lineage — companion / follow-up traces on the same place thread. */

export const PIN_LINEAGE_PARENT_EVENT_ID_META_KEY =
  "pinLineageParentEventId" as const;

export function readPinLineageParentEventId(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const raw = metadata?.[PIN_LINEAGE_PARENT_EVENT_ID_META_KEY];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function stampPinLineageParent(
  metadata: Record<string, unknown>,
  parentEventId: string | null | undefined,
): Record<string, unknown> {
  const parent = parentEventId?.trim();
  if (!parent) {
    return metadata;
  }
  return {
    ...metadata,
    [PIN_LINEAGE_PARENT_EVENT_ID_META_KEY]: parent,
  };
}
