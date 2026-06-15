import type { PeerThreadSettings } from "@/lib/context/peer-thread-types";

const SETTINGS_PREFIX = "rimvio.peer-thread.settings.v1";
const LOG_PREFIX = "rimvio.peer-thread.messages.v1";

function settingsKey(peerThreadId: string) {
  return `${SETTINGS_PREFIX}.${peerThreadId}`;
}

function logKey(peerThreadId: string) {
  return `${LOG_PREFIX}.${peerThreadId}`;
}

/** Write path — remove local peer data after retention window. */
export function purgePeerThreadData(peerThreadId: string) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(settingsKey(peerThreadId));
  localStorage.removeItem(logKey(peerThreadId));
}

export function deletePeerThreadSettings(peerThreadId: string) {
  purgePeerThreadData(peerThreadId);
}
