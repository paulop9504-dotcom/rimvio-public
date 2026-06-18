/** Days until unpinned peer data is purged; ROOM slot stays on hub. */
export const UNPIN_PEER_RETENTION_DAYS = 7;

export function purgeAfterIso(fromIso: string): string {
  const d = new Date(fromIso);
  d.setDate(d.getDate() + UNPIN_PEER_RETENTION_DAYS);
  return d.toISOString();
}

export function daysUntilPurge(purgeAfterIso: string, now = Date.now()): number {
  const ms = new Date(purgeAfterIso).getTime() - now;
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function isPurgeDue(purgeAfterIso: string, now = Date.now()): boolean {
  return new Date(purgeAfterIso).getTime() <= now;
}
