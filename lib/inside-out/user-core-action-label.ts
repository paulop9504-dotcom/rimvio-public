import type { EventCandidate } from "@/lib/events/event-candidate";

const GENERIC_TITLES = new Set(["일정", "메모", "이벤트", "알림"]);

function readUserNoteLine(event: EventCandidate): string | null {
  const meta = event.metadata;
  if (meta && typeof meta === "object") {
    if (typeof meta.userNote === "string" && meta.userNote.trim()) {
      return meta.userNote.trim();
    }
    if (typeof meta.sourceLine === "string" && meta.sourceLine.trim()) {
      return meta.sourceLine.trim();
    }
    if (meta.channel === "peer_talk" && event.title.trim()) {
      return event.title.trim();
    }
  }
  const title = event.title.trim();
  if (title && !GENERIC_TITLES.has(title)) {
    return title;
  }
  return null;
}

/** P0-2 — primary button shows what the user actually said (marble title / source line). */
export function deriveUserCoreActionLabel(event: EventCandidate): string | null {
  const line = readUserNoteLine(event);
  if (!line || line.length < 2) {
    return null;
  }
  const max = 32;
  if (line.length <= max) {
    return line;
  }
  return `${line.slice(0, max - 1)}…`;
}
