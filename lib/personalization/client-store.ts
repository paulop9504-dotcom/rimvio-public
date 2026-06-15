"use client";

import { getAnalyticsSessionId } from "@/lib/analytics/store";
import { applyRecencyWeights } from "@/lib/personalization/constants";
import type {
  ActionFamily,
  DomainFamily,
  LinkLifecycleRecord,
  LinkLifecycleState,
  RecentActionProfile,
  RecentClickEntry,
} from "@/lib/personalization/types";
import { nextLifecycleState } from "@/lib/personalization/action-family";

const PROFILE_KEY = "rimvio:recent-action-profile";
const LINK_STATES_KEY = "rimvio:link-lifecycle-states";
const PRIMARY_LOCK_KEY = "rimvio:primary-action-locks";
const MERGE_FLAG_KEY = "rimvio:personalization-merge-done";

export type PrimaryActionLock = {
  actionId: string;
  actionFamily: ActionFamily;
  lockedAt: string;
};

export function getPersonalizationSessionId() {
  return getAnalyticsSessionId();
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

export function readLocalRecentProfile(): RecentActionProfile {
  return readJson<RecentActionProfile>(PROFILE_KEY, {
    recent_clicks: [],
    family_counts: {},
    domain_affinity: {},
    click_total: 0,
  });
}

export function writeLocalRecentProfile(profile: RecentActionProfile) {
  writeJson(PROFILE_KEY, profile);
}

export function readLocalLinkStates(): Record<string, LinkLifecycleRecord> {
  return readJson<Record<string, LinkLifecycleRecord>>(LINK_STATES_KEY, {});
}

export function writeLocalLinkStates(states: Record<string, LinkLifecycleRecord>) {
  writeJson(LINK_STATES_KEY, states);
}

export function readLocalLinkState(linkId: string): LinkLifecycleRecord | null {
  return readLocalLinkStates()[linkId] ?? null;
}

export function readPrimaryActionLock(linkId: string): PrimaryActionLock | null {
  const locks = readJson<Record<string, PrimaryActionLock>>(PRIMARY_LOCK_KEY, {});
  return locks[linkId] ?? null;
}

function writePrimaryActionLock(linkId: string, lock: PrimaryActionLock) {
  const locks = readJson<Record<string, PrimaryActionLock>>(PRIMARY_LOCK_KEY, {});
  locks[linkId] = lock;
  writeJson(PRIMARY_LOCK_KEY, locks);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rimvio:primary-lock"));
  }
}

function recomputeDomainAffinity(clicks: RecentClickEntry[]) {
  const totals = new Map<DomainFamily, number>();
  let sum = 0;

  for (const click of clicks) {
    const weight = click.weight ?? 1;
    sum += weight;
    totals.set(
      click.domain_family,
      (totals.get(click.domain_family) ?? 0) + weight
    );
  }

  if (sum <= 0) {
    return {};
  }

  const affinity: Partial<Record<DomainFamily, number>> = {};
  for (const [domain, weight] of totals) {
    affinity[domain] = Number((weight / sum).toFixed(4));
  }

  return affinity;
}

export const UNDONE_WINDOW_MS = 60_000;

/** Optimistic save — sets lifecycle to saved for undo detection. */
export function recordLocalLinkSave(input: {
  linkId: string;
  domainFamily: DomainFamily;
  linkCategory?: string | null;
  savedAt: string;
}) {
  const states = readLocalLinkStates();
  if (states[input.linkId]) {
    return;
  }

  states[input.linkId] = {
    link_id: input.linkId,
    domain_family: input.domainFamily,
    link_category: input.linkCategory ?? null,
    lifecycle_state: "saved",
    first_saved_at: input.savedAt,
    last_opened_at: null,
    last_action_family: null,
    last_action_at: null,
    reopen_count: 0,
  };

  writeLocalLinkStates(states);
}

/** Returns undo window info when link removed within 60s of save. */
export function markLocalLinkUndoneIfRecent(linkId: string) {
  const states = readLocalLinkStates();
  const existing = states[linkId];
  if (!existing) {
    return null;
  }

  const undone_within_ms = Date.now() - new Date(existing.first_saved_at).getTime();
  if (undone_within_ms > UNDONE_WINDOW_MS) {
    return null;
  }

  states[linkId] = { ...existing, lifecycle_state: "undone" };
  writeLocalLinkStates(states);

  return { undone_within_ms };
}

/** Optimistic local click — mirrors server RPC for instant UI. */
export function recordLocalPersonalizationClick(input: {
  linkId: string;
  actionId: string;
  actionFamily: ActionFamily;
  domainFamily: DomainFamily;
  linkCategory?: string | null;
  contextBin: string;
}) {
  const profile = readLocalRecentProfile();
  const entry: RecentClickEntry = {
    action_family: input.actionFamily,
    domain_family: input.domainFamily,
    context_bin: input.contextBin,
    weight: 1,
    ts: new Date().toISOString(),
  };

  const recent_clicks = applyRecencyWeights([entry, ...profile.recent_clicks]);
  const family_counts = { ...profile.family_counts };
  family_counts[input.actionFamily] = (family_counts[input.actionFamily] ?? 0) + 1;

  writeLocalRecentProfile({
    recent_clicks,
    family_counts,
    domain_affinity: recomputeDomainAffinity(recent_clicks),
    click_total: profile.click_total + 1,
    updated_at: new Date().toISOString(),
  });

  writePrimaryActionLock(input.linkId, {
    actionId: input.actionId,
    actionFamily: input.actionFamily,
    lockedAt: new Date().toISOString(),
  });

  const states = readLocalLinkStates();
  const existing = states[input.linkId];
  const lifecycle_state = nextLifecycleState(
    existing?.lifecycle_state ?? "saved",
    input.actionFamily
  );

  states[input.linkId] = {
    link_id: input.linkId,
    domain_family: input.domainFamily,
    link_category: input.linkCategory ?? null,
    lifecycle_state,
    first_saved_at: existing?.first_saved_at ?? new Date().toISOString(),
    last_opened_at: existing?.last_opened_at ?? null,
    last_action_family: input.actionFamily,
    last_action_at: new Date().toISOString(),
    reopen_count: existing?.reopen_count ?? 0,
  };

  writeLocalLinkStates(states);
}

/** Optimistic reopen — bumps lifecycle without waiting for network. */
export function recordLocalLinkReopen(input: {
  linkId: string;
  domainFamily: DomainFamily;
  linkCategory?: string | null;
}): LinkLifecycleRecord {
  const states = readLocalLinkStates();
  const existing = states[input.linkId];
  const lifecycle_state: LinkLifecycleState =
    existing?.lifecycle_state === "saved" ? "opened" : existing?.lifecycle_state ?? "saved";

  const next: LinkLifecycleRecord = {
    link_id: input.linkId,
    domain_family: input.domainFamily,
    link_category: input.linkCategory ?? null,
    lifecycle_state,
    first_saved_at: existing?.first_saved_at ?? new Date().toISOString(),
    last_opened_at: new Date().toISOString(),
    last_action_family: existing?.last_action_family ?? null,
    last_action_at: existing?.last_action_at ?? null,
    reopen_count: (existing?.reopen_count ?? 0) + 1,
  };

  states[input.linkId] = next;
  writeLocalLinkStates(states);
  return next;
}

export function mergeLocalProfileFromServer(profile: RecentActionProfile) {
  writeLocalRecentProfile(profile);
}

export function hasPendingGuestMerge(userId: string | null) {
  if (!userId || typeof window === "undefined") {
    return false;
  }

  const flag = localStorage.getItem(`${MERGE_FLAG_KEY}:${userId}`);
  return flag !== "1";
}

export function markGuestMergeDone(userId: string) {
  localStorage.setItem(`${MERGE_FLAG_KEY}:${userId}`, "1");
}

export async function requestGuestPersonalizationMerge(userId: string) {
  if (!hasPendingGuestMerge(userId)) {
    return;
  }

  const sessionId = getPersonalizationSessionId();

  try {
    const response = await fetch("/api/personalization/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (response.ok) {
      markGuestMergeDone(userId);
    }
  } catch {
    // Retry on next session.
  }
}
