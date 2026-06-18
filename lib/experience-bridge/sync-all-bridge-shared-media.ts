"use client";

import { fetchPendingBridgeInvitesRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { listBridgeLinkedEventIds } from "@/lib/experience-bridge/list-bridge-linked-event-ids";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";
import { syncBridgeSharedMediaFromRemote } from "@/lib/experience-bridge/sync-bridge-participant-media";

async function collectBridgeEventIds(
  priorityEventId?: string | null,
): Promise<string[]> {
  const ids = new Set(listBridgeLinkedEventIds());
  try {
    const pending = await fetchPendingBridgeInvitesRemote();
    for (const row of pending.invites ?? []) {
      const key = row.state.bridge.eventId.trim();
      if (key) {
        ids.add(key);
      }
    }
  } catch {
    // offline / logged out
  }

  const priority = priorityEventId?.trim() ?? "";
  const all = [...ids].filter(Boolean);
  if (!priority) {
    return all;
  }
  return [priority, ...all.filter((id) => id !== priority)];
}

/** Pull friend/host media for every linked bridge event. Returns merge count. */
export async function syncAllBridgeSharedMedia(input?: {
  viewerUserId?: string | null;
  /** Sync this event first (e.g. active map pin). */
  priorityEventId?: string | null;
}): Promise<number> {
  const ids = await collectBridgeEventIds(input?.priorityEventId);
  if (ids.length === 0) {
    return 0;
  }

  let changed = 0;
  for (const eventId of ids) {
    const merged = await syncBridgeSharedMediaFromRemote(
      eventId,
      input?.viewerUserId ?? null,
    );
    if (merged) {
      changed += 1;
    }
  }

  if (changed > 0) {
    notifyBridgeSharedMediaUpdated();
  }

  return changed;
}
