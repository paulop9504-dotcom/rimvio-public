import type { CorrectionLogEntry } from "@/lib/action-chat/confirmation-types";

export function mergeCorrectionLogEntries(
  local: CorrectionLogEntry[],
  remote: CorrectionLogEntry[]
): CorrectionLogEntry[] {
  const byId = new Map<string, CorrectionLogEntry>();

  for (const entry of [...remote, ...local]) {
    const existing = byId.get(entry.id);
    if (!existing) {
      byId.set(entry.id, entry);
      continue;
    }
    const existingTs = new Date(existing.createdAt).getTime();
    const nextTs = new Date(entry.createdAt).getTime();
    if (nextTs >= existingTs) {
      byId.set(entry.id, entry);
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
