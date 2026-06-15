import type { PeerContact, PeerContactBook } from "@/lib/context/peer-contact-types";

const CONTACTS_KEY = "rimvio.peer-contacts.v1";

/** Soft cap — prevents runaway localStorage; not a product limit. */
export const PEER_CONTACT_SOFT_CAP = 500;

let memoryContacts: PeerContact[] | null = null;

function readBook(): PeerContactBook {
  if (memoryContacts !== null) {
    return { contacts: memoryContacts };
  }
  if (typeof window === "undefined") {
    return { contacts: [] };
  }
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (!raw) {
      return { contacts: [] };
    }
    const parsed = JSON.parse(raw) as PeerContactBook;
    if (!Array.isArray(parsed.contacts)) {
      return { contacts: [] };
    }
    return parsed;
  } catch {
    return { contacts: [] };
  }
}

function writeBook(book: PeerContactBook) {
  const sorted = [...book.contacts].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const next = sorted.slice(0, PEER_CONTACT_SOFT_CAP);
  if (memoryContacts !== null) {
    memoryContacts = next;
    return;
  }
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(
    CONTACTS_KEY,
    JSON.stringify({
      contacts: next,
    })
  );
}

export function readPeerContacts(): PeerContact[] {
  return readBook().contacts;
}

export function getPeerContactById(peerThreadId: string): PeerContact | null {
  return readPeerContacts().find((c) => c.peerThreadId === peerThreadId) ?? null;
}

export function findPeerContactByDisplayName(displayName: string): PeerContact | null {
  const needle = displayName.trim().toLowerCase();
  if (!needle) {
    return null;
  }
  return (
    readPeerContacts().find((c) => c.displayName.trim().toLowerCase() === needle) ??
    null
  );
}

function newPeerThreadId(displayName: string): string {
  const slug = displayName.trim().toLowerCase().replace(/\s+/g, "-") || "friend";
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `peer-${slug}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `peer-${slug}-${Date.now().toString(36)}`;
}

export type AddPeerContactResult =
  | { ok: true; contact: PeerContact; created: boolean }
  | { ok: false; reason: "empty_name" };

/** Write path — add or refresh contact in unlimited book. */
export function addPeerContact(input: {
  displayName: string;
  peerThreadId?: string;
  rimvioId?: string | null;
  emailLower?: string | null;
  profileDisplayName?: string | null;
  roomDisplayName?: string | null;
}): AddPeerContactResult {
  const displayName = input.displayName.trim();
  if (!displayName) {
    return { ok: false, reason: "empty_name" };
  }

  const now = new Date().toISOString();
  const existing =
    (input.peerThreadId ? getPeerContactById(input.peerThreadId) : null) ??
    findPeerContactByDisplayName(displayName);

  if (existing) {
    const updated: PeerContact = {
      ...existing,
      displayName,
      rimvioId: input.rimvioId ?? existing.rimvioId,
      emailLower: input.emailLower ?? existing.emailLower,
      profileDisplayName:
        input.profileDisplayName ?? existing.profileDisplayName,
      roomDisplayName: input.roomDisplayName ?? existing.roomDisplayName,
      updatedAt: now,
    };
    writeBook({
      contacts: [
        updated,
        ...readPeerContacts().filter((c) => c.peerThreadId !== existing.peerThreadId),
      ],
    });
    return { ok: true, contact: updated, created: false };
  }

  const contact: PeerContact = {
    peerThreadId: input.peerThreadId ?? newPeerThreadId(displayName),
    displayName,
    rimvioId: input.rimvioId ?? null,
    emailLower: input.emailLower ?? null,
    profileDisplayName: input.profileDisplayName ?? null,
    roomDisplayName: input.roomDisplayName ?? null,
    createdAt: now,
    updatedAt: now,
  };
  writeBook({ contacts: [contact, ...readPeerContacts()] });
  return { ok: true, contact, created: true };
}

/** Write path — remove from contact book (does not purge message log). */
export function removePeerContact(peerThreadId: string) {
  writeBook({
    contacts: readPeerContacts().filter((c) => c.peerThreadId !== peerThreadId),
  });
}

/** Write path — ensure pinned roster peers appear in contact book. */
export function syncPeerContactsFromRoster(
  entries: ReadonlyArray<{ peerThreadId: string; displayName: string }>
) {
  for (const entry of entries) {
    if (!entry.peerThreadId || !entry.displayName?.trim()) {
      continue;
    }
    addPeerContact({
      peerThreadId: entry.peerThreadId,
      displayName: entry.displayName,
    });
  }
}

export function resetPeerContactsForTests(contacts: PeerContact[] = []) {
  memoryContacts = contacts;
  if (typeof window !== "undefined") {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify({ contacts }));
  }
}

export function clearPeerContactsTestOverride() {
  memoryContacts = null;
}
