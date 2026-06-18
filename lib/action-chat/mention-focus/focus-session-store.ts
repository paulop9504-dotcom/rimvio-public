import type { InlineChatFocusWire } from "@/lib/action-chat/mention-focus/inline-chat-focus";

export type FocusSessionStatus = "running" | "done";

export type FocusSessionRecord = {
  sessionId: string;
  messageId: string;
  startedAt: string;
  endsAt: string;
  durationMs: number;
  label: string;
  absorbKakao: boolean;
  absorbEmail: boolean;
  absorbDistractions: boolean;
  status: FocusSessionStatus;
  heldShadowIds: string[];
};

export const FOCUS_SESSION_STORAGE_KEY = "rimvio.focus-session.v1";
export const FOCUS_SESSION_UPDATED = "rimvio-focus-session-updated";

let memorySession: FocusSessionRecord | null = null;

function dispatchUpdated() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(FOCUS_SESSION_UPDATED));
}

export function readFocusSession(): FocusSessionRecord | null {
  if (typeof window === "undefined") {
    return memorySession;
  }
  try {
    const raw = window.sessionStorage.getItem(FOCUS_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as FocusSessionRecord;
    return parsed?.sessionId ? parsed : null;
  } catch {
    return null;
  }
}

export function writeFocusSession(session: FocusSessionRecord | null) {
  memorySession = session;
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!session) {
      window.sessionStorage.removeItem(FOCUS_SESSION_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(FOCUS_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    dispatchUpdated();
  } catch {
    // ignore quota
  }
}

export function isFocusSessionRunning(now = Date.now()): boolean {
  const session = readFocusSession();
  if (!session || session.status !== "running") {
    return false;
  }
  const endsAtMs = new Date(session.endsAt).getTime();
  return Number.isFinite(endsAtMs) && endsAtMs > now;
}

export function appendHeldShadowId(shadowId: string) {
  const session = readFocusSession();
  if (!session || session.status !== "running") {
    return;
  }
  if (session.heldShadowIds.includes(shadowId)) {
    return;
  }
  writeFocusSession({
    ...session,
    heldShadowIds: [...session.heldShadowIds, shadowId],
  });
}

export function clearFocusSession() {
  writeFocusSession(null);
}

export function startFocusSessionFromWire(input: {
  messageId: string;
  wire: InlineChatFocusWire;
  now?: number;
}): FocusSessionRecord {
  const now = input.now ?? Date.now();
  const startedAt = new Date(now).toISOString();
  const endsAt = new Date(now + input.wire.durationMs).toISOString();
  const session: FocusSessionRecord = {
    sessionId: crypto.randomUUID(),
    messageId: input.messageId,
    startedAt,
    endsAt,
    durationMs: input.wire.durationMs,
    label: input.wire.label,
    absorbKakao: input.wire.absorbKakao,
    absorbEmail: input.wire.absorbEmail,
    absorbDistractions: input.wire.absorbDistractions,
    status: "running",
    heldShadowIds: [],
  };
  writeFocusSession(session);
  return session;
}

export function resetFocusSessionForTests(session: FocusSessionRecord | null = null) {
  memorySession = session;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(FOCUS_SESSION_STORAGE_KEY);
  }
}
