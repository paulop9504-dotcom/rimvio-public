"use client";

import type { CorrectionLogEntry } from "@/lib/action-chat/confirmation-types";
import { getPersonalizationSessionId } from "@/lib/personalization/client-store";

export async function syncPlaceCorrectionToServer(
  entry: CorrectionLogEntry
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const sessionId = getPersonalizationSessionId();
  try {
    await fetch("/api/place-corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        entries: [entry],
      }),
    });
  } catch {
    // offline — local IndexedDB remains source of truth
  }
}

export async function fetchPlaceCorrectionsFromServer(
  limit = 30
): Promise<CorrectionLogEntry[]> {
  if (typeof window === "undefined") {
    return [];
  }

  const sessionId = getPersonalizationSessionId();
  try {
    const response = await fetch(
      `/api/place-corrections?sessionId=${encodeURIComponent(sessionId)}&limit=${limit}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as { entries?: CorrectionLogEntry[] };
    return payload.entries ?? [];
  } catch {
    return [];
  }
}
