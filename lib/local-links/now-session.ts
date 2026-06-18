import type { LinkRow } from "@/types/database";
import type { EnricherContext } from "@/lib/enrichers/types";

const NOW_LINK_KEY = "blink-now-link";
const NOW_CONTEXT_KEY = "blink-now-context";
const DISMISSED_KEY = "blink-dismissed-ids";

export function setNowLink(link: LinkRow) {
  sessionStorage.setItem(NOW_LINK_KEY, JSON.stringify(link));
}

export function readNowLink(): LinkRow | null {
  try {
    const raw = sessionStorage.getItem(NOW_LINK_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as LinkRow;
  } catch {
    return null;
  }
}

export function clearNowLink() {
  sessionStorage.removeItem(NOW_LINK_KEY);
  sessionStorage.removeItem(NOW_CONTEXT_KEY);
}

export function setNowContext(context: EnricherContext) {
  sessionStorage.setItem(NOW_CONTEXT_KEY, JSON.stringify(context));
}

export function readNowContext(): EnricherContext | null {
  try {
    const raw = sessionStorage.getItem(NOW_CONTEXT_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as EnricherContext;
  } catch {
    return null;
  }
}

export function readDismissedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function dismissLinkId(id: string) {
  const next = readDismissedIds();
  next.add(id);
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
}
