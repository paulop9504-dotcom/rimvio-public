const DM_SEP = "__";

export function isDmThreadId(threadId: string): boolean {
  return threadId.startsWith("peer-dm-") && threadId.includes(DM_SEP);
}

export function extractOtherUserIdFromDmThread(
  threadId: string,
  currentUserId: string,
): string | null {
  if (!isDmThreadId(threadId)) {
    return null;
  }
  const body = threadId.slice("peer-dm-".length);
  const [a, b] = body.split(DM_SEP);
  if (a === currentUserId) {
    return b ?? null;
  }
  if (b === currentUserId) {
    return a ?? null;
  }
  return null;
}