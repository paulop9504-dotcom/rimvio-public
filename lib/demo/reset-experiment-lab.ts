import { LOCAL_LINKS_UPDATED } from "@/lib/demo/seed";
import { experimentLabLinks } from "@/lib/demo/experiment-lab-links";
import {
  clearDismissedLinkIds,
  readLocalLinks,
  writeLocalLinks,
} from "@/lib/local-links/store";
import type { LinkRow } from "@/types/database";

export const EXPERIMENT_LAB_FLAG = "rimvio-experiment-lab-v3";
export const EXPERIMENT_LAB_VERSION_KEY = "rimvio-experiment-lab-version";
/** Bump when feed content/count changes so dev clients auto-refresh stale localStorage. */
export const EXPERIMENT_LAB_VERSION = "v3-46-2";

const PREFIX_KEYS = [
  "blink-local-links",
  "blink-dismissed-link-ids",
  "rimvio:save-trajectory",
  "rimvio:trajectory-burst-session",
  "rimvio:recent-action-profile",
  "rimvio:link-lifecycle-states",
  "rimvio:primary-action-locks",
  "blink-analytics-events",
  "blink-pinned-url",
  "blink-completion-log",
  "blink-fun-feed-v3",
  "blink-reminders",
];

function notifyLinksUpdated() {
  window.dispatchEvent(new Event(LOCAL_LINKS_UPDATED));
}

/** Wipe experiment-related local state (links, telemetry, trajectory). */
export function clearExperimentLabState() {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of PREFIX_KEYS) {
    localStorage.removeItem(key);
  }

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key) {
      continue;
    }

    if (key.startsWith("rimvio:related:") || key.startsWith("rimvio:personalization-merge-done:")) {
      localStorage.removeItem(key);
    }
  }

  sessionStorage.removeItem("blink-analytics-session-id");
}

export function isExperimentLabMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(EXPERIMENT_LAB_FLAG) === "1";
}

function sortLinksByCreatedAt(links: LinkRow[]) {
  return [...links].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function isCurrentLabFeed(links: LinkRow[]) {
  const byId = new Map(links.map((link) => [link.id, link]));
  return experimentLabLinks.every((labLink) => byId.has(labLink.id));
}

function mergeLabFeedWithUserLinks(existing: LinkRow[]) {
  const labIds = new Set(experimentLabLinks.map((link) => link.id));
  const userLinks = existing.filter((link) => !labIds.has(link.id));
  const merged = sortLinksByCreatedAt([...userLinks, ...experimentLabLinks]);

  writeLocalLinks(merged);
  clearDismissedLinkIds();
  localStorage.setItem(EXPERIMENT_LAB_FLAG, "1");
  localStorage.setItem(EXPERIMENT_LAB_VERSION_KEY, EXPERIMENT_LAB_VERSION);
  notifyLinksUpdated();
  return merged;
}

/** Sync ?lab=fresh before React mounts (avoids fun-feed race). */
export function initExperimentLabFromUrl() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("lab") !== "fresh") {
    return false;
  }

  resetExperimentLab();
  return true;
}

/** Refresh stale lab feeds after version bumps without wiping telemetry. */
export function maybeUpgradeExperimentLabFeed() {
  if (typeof window === "undefined" || !isExperimentLabMode()) {
    return experimentLabLinks;
  }

  return ensureExperimentLabFeed(false);
}

export function ensureExperimentLabFeed(force = false) {
  if (typeof window === "undefined") {
    return experimentLabLinks;
  }

  const existing = readLocalLinks();
  const version = localStorage.getItem(EXPERIMENT_LAB_VERSION_KEY);
  const hasAllLabLinks = isCurrentLabFeed(existing);

  if (force) {
    return resetExperimentLab();
  }

  if (!isExperimentLabMode() || version !== EXPERIMENT_LAB_VERSION) {
    return mergeLabFeedWithUserLinks(existing);
  }

  if (!hasAllLabLinks) {
    return mergeLabFeedWithUserLinks(existing);
  }

  return existing;
}

/** Fresh experiment feed + empty telemetry vessel. */
export function resetExperimentLab() {
  if (typeof window === "undefined") {
    return experimentLabLinks;
  }

  clearExperimentLabState();
  writeLocalLinks(experimentLabLinks);
  clearDismissedLinkIds();
  localStorage.setItem(EXPERIMENT_LAB_FLAG, "1");
  localStorage.setItem(EXPERIMENT_LAB_VERSION_KEY, EXPERIMENT_LAB_VERSION);
  notifyLinksUpdated();
  return experimentLabLinks;
}
