import type { PeerMessage, PeerMessageLog } from "@/lib/context/peer-message-types";

const LOG_PREFIX = "rimvio.peer-thread.messages.v1";
const MAX_MESSAGES = 200;

export const PEER_MESSAGE_LOG_UPDATED = "rimvio:peer-message-log-updated";

function emitPeerMessageLogUpdated(peerThreadId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(PEER_MESSAGE_LOG_UPDATED, { detail: { peerThreadId } }),
  );
}

function logKey(peerThreadId: string) {
  return `${LOG_PREFIX}.${peerThreadId}`;
}

export function emptyPeerMessageLog(peerThreadId: string): PeerMessageLog {
  return {
    peerThreadId,
    messages: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Read-only — no mutation. */
export function readPeerMessageLog(peerThreadId: string): PeerMessageLog {
  if (typeof window === "undefined") {
    return emptyPeerMessageLog(peerThreadId);
  }
  try {
    const raw = localStorage.getItem(logKey(peerThreadId));
    if (!raw) {
      return emptyPeerMessageLog(peerThreadId);
    }
    const parsed = JSON.parse(raw) as PeerMessageLog;
    if (parsed.peerThreadId !== peerThreadId || !Array.isArray(parsed.messages)) {
      return emptyPeerMessageLog(peerThreadId);
    }
    return parsed;
  } catch {
    return emptyPeerMessageLog(peerThreadId);
  }
}

export function writePeerMessageLog(log: PeerMessageLog) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(
    logKey(log.peerThreadId),
    JSON.stringify({
      ...log,
      messages: log.messages.slice(-MAX_MESSAGES),
      updatedAt: new Date().toISOString(),
    })
  );
  emitPeerMessageLogUpdated(log.peerThreadId);
}

/** 서버 동기화 후 다음 입장 시 즉시 표시 */
export function replacePeerMessageLog(
  peerThreadId: string,
  messages: PeerMessage[],
) {
  writePeerMessageLog({
    peerThreadId,
    messages,
    updatedAt: new Date().toISOString(),
  });
}

export function appendPeerMessage(input: {
  peerThreadId: string;
  author: PeerMessage["author"];
  body: string;
  now?: string;
}): PeerMessage {
  const trimmed = input.body.trim();
  const log = readPeerMessageLog(input.peerThreadId);
  const message: PeerMessage = {
    id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    peerThreadId: input.peerThreadId,
    author: input.author,
    body: trimmed,
    sentAt: input.now ?? new Date().toISOString(),
    messageType: "human",
  };
  writePeerMessageLog({
    peerThreadId: input.peerThreadId,
    messages: [...log.messages, message],
    updatedAt: message.sentAt,
  });
  return message;
}
