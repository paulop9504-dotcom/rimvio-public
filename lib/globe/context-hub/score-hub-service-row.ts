import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";

/** Static hub-row score — baseline before spacetime JIT in rankContextResources. */
export function scoreHubServiceRowBase(row: ContextHubServiceRow): number {
  if (!row.offered) {
    return 0;
  }
  if (row.serviceId === "ticket") {
    if (row.handoffHref) {
      return 112;
    }
    if (row.connected && row.link?.actionUrl) {
      return 108;
    }
    if (row.connected) {
      return 95;
    }
  }
  if (!row.implemented) {
    return 10;
  }
  if (row.connected && row.link?.actionUrl) {
    return 100;
  }
  if (row.handoffHref) {
    return 92;
  }
  if (row.connected) {
    return 75;
  }
  return 50;
}
