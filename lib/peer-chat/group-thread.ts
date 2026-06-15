/** Rimvio 단톡 — stable group thread ids (`peer-group-{uuid}`). */

export const GROUP_THREAD_PREFIX = "peer-group-" as const;

export function buildGroupThreadId(): string {
  return `${GROUP_THREAD_PREFIX}${crypto.randomUUID()}`;
}

export function isGroupThreadId(threadId: string): boolean {
  return threadId.startsWith(GROUP_THREAD_PREFIX);
}

export function isPeerThreadId(threadId: string): boolean {
  return (
    (threadId.startsWith("peer-dm-") && threadId.includes("__")) ||
    isGroupThreadId(threadId)
  );
}
