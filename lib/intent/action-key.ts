import type { LinkActionItem } from "@/types/database";

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Stable key across enrich runs (not action UUID). */
export function toActionKey(action: LinkActionItem) {
  const icon = action.payload?.icon;
  if (typeof icon === "string" && icon.length > 0) {
    return `${action.kind}:${icon}`;
  }

  return `${action.kind}:${slug(action.label || "action")}`;
}
