import type { BaseActionType, MergedTemplateWire } from "@/lib/action-template/types";

const ACTION_TYPES = new Set<BaseActionType>([
  "CHECKLIST",
  "LINK",
  "SAVE",
  "CALL",
  "NAVIGATE",
  "ZOOM",
  "INFO",
  "CHECK",
]);

export function parseMergedTemplateWire(raw: string | Record<string, unknown>): MergedTemplateWire | null {
  try {
    const parsed =
      typeof raw === "string"
        ? (JSON.parse(raw) as Record<string, unknown>)
        : raw;

    const added_items = Array.isArray(parsed.added_items)
      ? parsed.added_items
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }
            const record = entry as Record<string, unknown>;
            const item = typeof record.item === "string" ? record.item.trim() : "";
            if (!item) {
              return null;
            }
            return {
              item,
              reason: typeof record.reason === "string" ? record.reason : undefined,
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : [];

    const added_actions = Array.isArray(parsed.added_actions)
      ? parsed.added_actions
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }
            const record = entry as Record<string, unknown>;
            const typeRaw = typeof record.type === "string" ? record.type.trim().toUpperCase() : "";
            const type = ACTION_TYPES.has(typeRaw as BaseActionType)
              ? (typeRaw as BaseActionType)
              : "INFO";
            const label = typeof record.label === "string" ? record.label.trim() : "";
            const id = typeof record.id === "string" ? record.id.trim() : "";
            if (!label || !id) {
              return null;
            }
            return {
              type,
              label,
              id,
              reason: typeof record.reason === "string" ? record.reason : undefined,
            };
          })
          .filter((action): action is NonNullable<typeof action> => Boolean(action))
      : [];

    const template_id =
      typeof parsed.template_id === "string" && parsed.template_id.trim()
        ? parsed.template_id.trim()
        : "merged";

    const name =
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim()
        : "맞춤 템플릿";

    return {
      template_id,
      name,
      added_items,
      added_actions,
      removed_item_ids: Array.isArray(parsed.removed_item_ids)
        ? parsed.removed_item_ids.filter((id): id is string => typeof id === "string")
        : [],
      thought:
        typeof parsed.thought === "string"
          ? parsed.thought
          : "LLM template merge",
    };
  } catch {
    return null;
  }
}
