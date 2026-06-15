import type { LinkRow } from "@/types/database";
import { funFeedLinks } from "@/lib/demo/fun-feed-links";
import {
  ensureExperimentLabFeed,
  EXPERIMENT_LAB_FLAG,
  isExperimentLabMode,
} from "@/lib/demo/reset-experiment-lab";
import { readLocalLinks, writeLocalLinks, clearDismissedLinkIds } from "@/lib/local-links/store";

const DEMO_FLAG = "blink-fun-feed-v3";
const FUN_FEED_MARKER = "fun-google-portal";

function needsFunSeed() {
  if (isExperimentLabMode()) {
    return false;
  }

  const existing = readLocalLinks();

  if (existing.length === 0) {
    return true;
  }

  if (localStorage.getItem(DEMO_FLAG) === "1") {
    return !existing.some((link) => link.id === FUN_FEED_MARKER);
  }

  return true;
}

export const LOCAL_LINKS_UPDATED = "rimvio-local-links-updated";

function notifyLocalLinksUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(LOCAL_LINKS_UPDATED));
}

export function seedDemoLinks(force = false): LinkRow[] {
  if (typeof window === "undefined") {
    return funFeedLinks;
  }

  if (isExperimentLabMode()) {
    return ensureExperimentLabFeed(force);
  }

  if (!force && !needsFunSeed()) {
    const existing = readLocalLinks();
    return existing.length > 0 ? existing : funFeedLinks;
  }

  writeLocalLinks(funFeedLinks);
  clearDismissedLinkIds();
  localStorage.setItem(DEMO_FLAG, "1");
  notifyLocalLinksUpdated();
  return funFeedLinks;
}

export function readDemoLinks(): LinkRow[] {
  return readLocalLinks();
}

export function clearDemoLinks() {
  localStorage.removeItem(DEMO_FLAG);
  localStorage.removeItem(EXPERIMENT_LAB_FLAG);
  writeLocalLinks([]);
}
