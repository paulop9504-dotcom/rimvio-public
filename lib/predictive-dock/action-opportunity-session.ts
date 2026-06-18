"use client";

import type { ConversationIntentDomain } from "@/lib/predictive-dock/action-opportunity-types";

const CONSUMED_KEY = "rimvio-opportunity-consumed.v1";
const INTENT_KEY = "rimvio-opportunity-intent.v1";

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

/** Intent switched → discard stale dock opportunities (Rule: new intent → new dock). */
export function syncOpportunityIntentEpoch(
  intent: ConversationIntentDomain
): boolean {
  const previous = readJson<ConversationIntentDomain | null>(INTENT_KEY, null);
  if (previous === intent) {
    return false;
  }
  writeJson(INTENT_KEY, intent);
  writeJson(CONSUMED_KEY, []);
  return true;
}

export function listConsumedOpportunityIds(): string[] {
  return readJson<string[]>(CONSUMED_KEY, []);
}

export function markOpportunityConsumed(id: string) {
  const current = new Set(listConsumedOpportunityIds());
  current.add(id);
  writeJson(CONSUMED_KEY, [...current].slice(-24));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rimvio:opportunity-consumed", { detail: { id } }));
  }
}

export function resetOpportunitySessionForTests() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(CONSUMED_KEY);
  localStorage.removeItem(INTENT_KEY);
}
