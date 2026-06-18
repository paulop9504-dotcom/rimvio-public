"use client";

import type { ExperienceBridgeState } from "@/lib/experience-bridge/experience-bridge-types";

const STORAGE_KEY = "rimvio.experience-bridge.v1";

function readAll(): Record<string, ExperienceBridgeState> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, ExperienceBridgeState>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(rows: Record<string, ExperienceBridgeState>) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    window.dispatchEvent(new CustomEvent("rimvio-experience-bridge-updated"));
  } catch {
    // ignore quota
  }
}

export const EXPERIENCE_BRIDGE_UPDATED = "rimvio-experience-bridge-updated";

export function readLocalBridgeState(
  eventId: string,
): ExperienceBridgeState | null {
  const key = eventId.trim();
  if (!key) {
    return null;
  }
  return readAll()[key] ?? null;
}

export function writeLocalBridgeState(state: ExperienceBridgeState) {
  const key = state.bridge.eventId.trim();
  if (!key) {
    return;
  }
  const rows = readAll();
  const existing = rows[key];
  if (existing && bridgeStatesEqual(existing, state)) {
    return;
  }
  rows[key] = state;
  writeAll(rows);
}

function bridgeStatesEqual(
  left: ExperienceBridgeState,
  right: ExperienceBridgeState,
): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

export function resetLocalBridgeStoreForTests() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
