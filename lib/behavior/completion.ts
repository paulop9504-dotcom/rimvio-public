import { LOCAL_LINKS_UPDATED } from "@/lib/demo/seed";
import { resolveBurnerFromLink } from "@/lib/behavior/burners";
import { updateLocalLink } from "@/lib/local-links/store";
import type { LifeBurner } from "@/lib/behavior/burners";
import type { LinkRow } from "@/types/database";

export const COMPLETION_UPDATED = "rimvio-completion-updated";

const COMPLETION_LOG_KEY = "blink-completion-log";

export type CompletionEntry = {
  linkId: string;
  title: string;
  url: string;
  completedAt: string;
  burner: LifeBurner;
};

function readCompletionLog(): CompletionEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(COMPLETION_LOG_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CompletionEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCompletionLog(entries: CompletionEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(COMPLETION_LOG_KEY, JSON.stringify(entries.slice(0, 200)));
}

function notifyCompletionUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(COMPLETION_UPDATED));
  window.dispatchEvent(new Event(LOCAL_LINKS_UPDATED));
}

export function markInboxLinkDone(link: LinkRow): CompletionEntry {
  updateLocalLink(link.id, { link_status: "done" });

  const entry: CompletionEntry = {
    linkId: link.id,
    title: link.title,
    url: link.original_url,
    completedAt: new Date().toISOString(),
    burner: resolveBurnerFromLink(link),
  };

  const log = readCompletionLog().filter((item) => item.linkId !== link.id);
  writeCompletionLog([entry, ...log]);
  notifyCompletionUpdated();

  return entry;
}

export function readTodayCompletions(now = Date.now()): CompletionEntry[] {
  const todayKey = new Date(now).toDateString();

  return readCompletionLog().filter(
    (entry) => new Date(entry.completedAt).toDateString() === todayKey
  );
}

export function isLinkOpen(link: Pick<LinkRow, "link_status">) {
  return link.link_status !== "done";
}
