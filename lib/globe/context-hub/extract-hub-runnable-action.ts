import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";

export type HubRunnableAction = {
  href: string;
  label: string;
  internalRoute: boolean;
};

/** Actionable handoff from a hub service row — plug-in rows return null. */
export function extractHubRunnableAction(
  row: ContextHubServiceRow,
): HubRunnableAction | null {
  const label = row.link?.actionLabelKo ?? row.handoffLabelKo ?? row.labelKo;

  if (row.serviceId === "ticket" && row.handoffHref) {
    return {
      href: row.handoffHref,
      label,
      internalRoute: false,
    };
  }

  if (row.connected && row.link?.actionUrl) {
    return {
      href: row.link.actionUrl,
      label,
      internalRoute: false,
    };
  }

  if (row.handoffHref && row.serviceId === "ai_search") {
    return {
      href: row.handoffHref,
      label,
      internalRoute: true,
    };
  }

  if (row.handoffHref) {
    return {
      href: row.handoffHref,
      label,
      internalRoute: false,
    };
  }

  return null;
}
