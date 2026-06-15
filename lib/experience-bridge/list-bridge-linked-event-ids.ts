"use client";

import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";
import { listLifeEventCandidates } from "@/lib/life-read-model";

const STORAGE_KEY = "rimvio.experience-bridge.v1";

function readLocalBridgeEventIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return [];
    }
    return Object.keys(parsed).filter((key) => key.trim());
  } catch {
    return [];
  }
}

function eventLooksBridgeLinked(metadata: Record<string, unknown> | undefined): boolean {
  if (!metadata) {
    return false;
  }
  if (
    metadata.experienceBridgeHost === true ||
    metadata.experienceBridgeParticipant === true
  ) {
    return true;
  }
  return typeof metadata[EXPERIENCE_BRIDGE_META_KEYS.bridgeId] === "string";
}

/** Local + life-read bridge event ids worth polling for shared media. */
export function listBridgeLinkedEventIds(): string[] {
  const ids = new Set<string>(readLocalBridgeEventIds());
  for (const event of listLifeEventCandidates()) {
    const meta = event.metadata as Record<string, unknown> | undefined;
    if (eventLooksBridgeLinked(meta)) {
      ids.add(event.id.trim());
    }
  }
  return [...ids].filter(Boolean);
}
