import type { PeerMessage } from "@/lib/context/peer-message-types";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import { cachedFetchJson } from "@/lib/http/client-fetch-cache";
import {
  BRIDGE_SLOTS_CACHE_MS,
  PEER_FEED_SLOTS_CACHE_KEY,
} from "@/lib/experience-bridge/bridge-api-cache";

import { friendContactErrorMessage } from "@/lib/peer-chat/friend-contact-errors";
import { resolveCanonicalPeerThreadFromSocialLayer } from "@/lib/peer-chat/resolve-canonical-peer-thread";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & {
    error?: string;
    message?: string;
  };
  if (!response.ok) {
    const raw =
      data.message ??
      data.error ??
      (typeof data === "object" &&
      data !== null &&
      "details" in data &&
      typeof (data as { details?: unknown }).details === "string"
        ? (data as { details: string }).details
        : undefined) ??
      `Request failed (${response.status})`;
    throw new Error(friendContactErrorMessage(String(raw)));
  }
  return data;
}

/** True when thread was opened via registered-user DM add flow. */
export function isRegisteredPeerDmThread(threadId: string): boolean {
  return threadId.startsWith("peer-dm-") && threadId.includes("__");
}

export type PeerPublicProfile = {
  userId: string;
  displayName: string | null;
  rimvioId: string | null;
  avatarUrl: string | null;
  emailLower: string | null;
};

export async function fetchRelationshipFeedSlots(): Promise<{
  slots: import("@/lib/social/relationship-slot-types").RelationshipFeedSlot[];
}> {
  const endpoint = `${resolveAppOrigin()}/api/peers/feed/slots`;
  return cachedFetchJson(
    PEER_FEED_SLOTS_CACHE_KEY,
    async () => {
      const response = await fetch(endpoint, { credentials: "include" });
      return parseJson(response);
    },
    BRIDGE_SLOTS_CACHE_MS,
  );
}

/** 관계 버블 DM → 피드 슬롯으로 당기기 (메시지 있을 때). */
export async function syncFeedSlotFromRoomRemote(
  roomId: string,
): Promise<{ ok: boolean; synced: boolean }> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/feed/slots/sync`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ roomId }),
    },
  );
  return parseJson(response);
}

export async function pinFeedSlotRemote(input: {
  roomId: string;
  pinned: boolean;
}): Promise<{ ok: boolean }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/feed/slots/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function fetchSocialLayer(): Promise<{
  pinned: import("@/lib/social/bubble-state").SocialBubblePeer[];
  archive: import("@/lib/social/bubble-state").SocialBubblePeer[];
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/social/layer`, {
    credentials: "include",
  });
  return parseJson(response);
}

export async function pinFriendRemote(input: {
  friendId: string;
  pinSlot: number;
}): Promise<{ ok: boolean }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/social/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function unpinFriendRemote(input: {
  friendId: string;
}): Promise<{ ok: boolean }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/social/unpin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function markPeerThreadReadRemote(threadId: string): Promise<void> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/social/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ threadId }),
  });
  await parseJson(response);
}

export async function fetchDmPeerPublicProfile(
  threadId: string,
): Promise<PeerPublicProfile> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}/peer-profile`,
    { credentials: "include" },
  );
  const data = await parseJson<{ profile: PeerPublicProfile }>(response);
  return data.profile;
}

export async function ensurePeerThreadRemote(input: {
  threadId: string;
  displayName: string;
}): Promise<{ threadId: string; inviteCode: string; displayName: string }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/threads/ensure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function createGroupThreadRemote(input: {
  displayName: string;
  memberThreadIds: string[];
}): Promise<{
  threadId: string;
  inviteCode: string;
  displayName: string;
  roomKind: "group";
  created: boolean;
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/threads/group`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function fetchPeerThreadMeta(threadId: string): Promise<{
  threadId: string;
  inviteCode: string;
  displayName: string;
  roomKind?: "dm" | "group";
  aiMode?: "private" | "shared";
}> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}`,
    { credentials: "include" },
  );
  return parseJson(response);
}

export type GroupReadCursor = {
  userId: string;
  lastReadAt: string | null;
};

export type PeerMessagesPayload = {
  messages: PeerMessage[];
  peerLastReadAt: string | null;
  groupReadCursors: GroupReadCursor[];
};

export async function fetchPeerMessages(
  threadId: string,
): Promise<PeerMessagesPayload> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}/messages`,
    { credentials: "include" },
  );
  return parseJson<PeerMessagesPayload>(response);
}

export type PeerReadStatePayload = {
  peerLastReadAt: string | null;
  groupReadCursors: GroupReadCursor[];
};

export async function fetchPeerReadState(
  threadId: string,
): Promise<PeerReadStatePayload> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}/read-state`,
    { credentials: "include" },
  );
  const data = await parseJson<{
    peerLastReadAt: string | null;
    groupReadCursors?: GroupReadCursor[];
  }>(response);
  return {
    peerLastReadAt: data.peerLastReadAt ?? null,
    groupReadCursors: data.groupReadCursors ?? [],
  };
}

export async function renameGroupThreadRemote(input: {
  threadId: string;
  displayName: string;
}): Promise<{ threadId: string; displayName: string; roomKind: "group" }> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(input.threadId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ displayName: input.displayName }),
    },
  );
  return parseJson(response);
}

export async function leaveGroupThreadRemote(threadId: string): Promise<{ ok: boolean }> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}/leave`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  return parseJson(response);
}

export async function invokePeerRoomAi(input: {
  threadId: string;
  displayName: string;
  prompt: string;
}): Promise<PeerMessage> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(input.threadId)}/ai`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        prompt: input.prompt,
        displayName: input.displayName,
      }),
    },
  );
  const data = await parseJson<{ message: PeerMessage }>(response);
  return data.message;
}

export async function sendPeerImageRemote(input: {
  threadId: string;
  displayName: string;
  file: File;
  caption?: string;
  spacetimeJson?: string;
}): Promise<PeerMessage> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("displayName", input.displayName);
  if (input.caption?.trim()) {
    form.append("caption", input.caption.trim());
  }
  if (input.spacetimeJson?.trim()) {
    form.append("spacetime", input.spacetimeJson.trim());
  }
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(input.threadId)}/messages/image`,
    {
      method: "POST",
      credentials: "include",
      body: form,
    },
  );
  const data = await parseJson<{ message: PeerMessage }>(response);
  return data.message;
}

async function resolveClientSendThreadId(input: {
  threadId: string;
  displayName: string;
}): Promise<string> {
  if (isRegisteredPeerDmThread(input.threadId)) {
    return input.threadId;
  }
  try {
    const layer = await fetchSocialLayer();
    return resolveCanonicalPeerThreadFromSocialLayer(
      {
        peerThreadId: input.threadId,
        displayName: input.displayName,
        rimvioId: null,
      },
      layer,
    );
  } catch {
    return input.threadId;
  }
}

export async function fetchSharedGlobePinsRemote(
  threadId: string,
): Promise<{
  pins: import("@/lib/peer-chat/globe-pin-types").SharedGlobePin[];
  threadId: string;
}> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}/globe-pins`,
    { credentials: "include" },
  );
  return parseJson(response);
}

export async function updateSharedGlobePinRemote(input: {
  threadId: string;
  messageId: string;
  placeLabel?: string;
  note?: string | null;
}): Promise<{
  pin: import("@/lib/peer-chat/globe-pin-types").SharedGlobePin;
  threadId: string;
}> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(input.threadId)}/globe-pins`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: input.messageId,
        placeLabel: input.placeLabel,
        note: input.note,
      }),
    },
  );
  return parseJson(response);
}

export async function deleteSharedGlobePinRemote(input: {
  threadId: string;
  messageId: string;
}): Promise<{ ok: true; threadId: string; messageId: string }> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(input.threadId)}/globe-pins`,
    {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: input.messageId }),
    },
  );
  return parseJson(response);
}

export async function sendSharedGlobePinRemote(input: {
  threadId: string;
  displayName: string;
  lat: number;
  lng: number;
  placeLabel: string;
  note?: string;
  capturedAtIso?: string;
  file?: File;
}): Promise<{
  pin: import("@/lib/peer-chat/globe-pin-types").SharedGlobePin;
  threadId: string;
}> {
  const sendThreadId = await resolveClientSendThreadId({
    threadId: input.threadId,
    displayName: input.displayName,
  });

  const post = async () => {
    const endpoint = `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(sendThreadId)}/globe-pins`;
    if (input.file) {
      const form = new FormData();
      form.append("lat", String(input.lat));
      form.append("lng", String(input.lng));
      form.append("placeLabel", input.placeLabel);
      form.append("displayName", input.displayName);
      if (input.note?.trim()) {
        form.append("note", input.note.trim());
      }
      if (input.capturedAtIso?.trim()) {
        form.append("capturedAtIso", input.capturedAtIso.trim());
      }
      form.append("file", input.file);
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      return parseJson(response);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        lat: input.lat,
        lng: input.lng,
        placeLabel: input.placeLabel,
        displayName: input.displayName,
        note: input.note,
        capturedAtIso: input.capturedAtIso,
      }),
    });
    return parseJson(response);
  };

  try {
    return await post();
  } catch (firstError) {
    try {
      await ensurePeerThreadRemote({
        threadId: sendThreadId,
        displayName: input.displayName,
      });
      return await post();
    } catch {
      throw firstError;
    }
  }
}

export async function sendPeerMessageRemote(input: {
  threadId: string;
  displayName: string;
  body: string;
}): Promise<PeerMessage> {
  const sendThreadId = await resolveClientSendThreadId(input);

  const post = async () => {
    const response = await fetch(
      `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(sendThreadId)}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          body: input.body,
          displayName: input.displayName,
        }),
      },
    );
    const data = await parseJson<{ message: PeerMessage }>(response);
    return data.message;
  };

  try {
    return await post();
  } catch (firstError) {
    try {
      await ensurePeerThreadRemote({
        threadId: sendThreadId,
        displayName: input.displayName,
      });
      return await post();
    } catch {
      throw firstError;
    }
  }
}

export type PeerThreadMemberPublic = {
  userId: string;
  displayName: string | null;
  rimvioId: string | null;
  avatarUrl: string | null;
  emailLower: string | null;
  isSelf: boolean;
};

export async function fetchPeerThreadMembers(
  threadId: string,
): Promise<PeerThreadMemberPublic[]> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}/members`,
    { credentials: "include" },
  );
  const data = await parseJson<{ members: PeerThreadMemberPublic[] }>(response);
  return data.members;
}

export async function addGroupMembersRemote(input: {
  threadId: string;
  memberThreadIds: string[];
}): Promise<{
  addedUserIds: string[];
  members: PeerThreadMemberPublic[];
}> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(input.threadId)}/members`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ memberThreadIds: input.memberThreadIds }),
    },
  );
  return parseJson(response);
}

export async function joinPeerThreadByInviteRemote(inviteCode: string): Promise<{
  threadId: string;
  displayName: string;
  inviteCode: string;
  roomKind: "dm" | "group";
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ inviteCode }),
  });
  return parseJson(response);
}

export function buildPeerInviteUrl(inviteCode: string) {
  const origin = resolveAppOrigin();
  return `${origin}/peers/join?code=${encodeURIComponent(inviteCode)}`;
}

export async function saveMyPhoneProfile(input: {
  phone: string;
  displayName?: string;
}): Promise<{ phone: string }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function fetchMyPhoneProfile(): Promise<{
  configured: boolean;
  phone: string | null;
  email?: string | null;
  rimvioId?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/phone`, {
    credentials: "include",
  });
  return parseJson(response);
}

export async function saveMyRimvioId(rimvioId: string): Promise<{ rimvioId: string }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/rimvio-id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ rimvioId }),
  });
  return parseJson(response);
}

export type MyAccountProfile = {
  configured: boolean;
  phone: string | null;
  email: string | null;
  rimvioId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export async function fetchMyAccountProfile(): Promise<MyAccountProfile> {
  const response = await fetchWithTimeout(`${resolveAppOrigin()}/api/peers/profile`, {
    credentials: "include",
    timeoutMs: 8_000,
    timeoutLabel: "profile",
  });
  return parseJson(response);
}

export async function uploadMyProfileAvatar(file: Blob): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append("file", file, "avatar.jpg");
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/avatar`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return parseJson(response);
}

export async function removeMyProfileAvatar(): Promise<{ avatarUrl: null }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/avatar`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJson(response);
}

export async function saveMyAccountProfile(input: {
  displayName?: string;
  phone?: string;
  rimvioId?: string;
  clearPhone?: boolean;
  clearAvatar?: boolean;
}): Promise<MyAccountProfile & { ok: boolean }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function syncMyProfileFromAuth(): Promise<{
  email: string | null;
  phone: string | null;
  rimvioId?: string | null;
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/sync`, {
    method: "POST",
    credentials: "include",
  });
  return parseJson(response);
}

export async function lookupFriendContactRemote(contact: string): Promise<{
  profile: {
    userId: string;
    displayName: string;
    rimvioId: string | null;
    avatarUrl: string | null;
    emailLower: string | null;
    matchedBy: string;
  };
  contact: string;
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/lookup-contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ contact: contact.trim() }),
  });
  return parseJson(response);
}

export async function addPeerByPhoneRemote(input: {
  phone?: string;
  contact?: string;
  displayName?: string;
  myPhone?: string;
}): Promise<{
  threadId: string;
  displayName: string;
  otherUserId?: string;
  rimvioId?: string | null;
  emailLower?: string | null;
  realtime: boolean;
}> {
  const contact = input.contact ?? input.phone ?? "";
  const response = await fetch(`${resolveAppOrigin()}/api/peers/add-by-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...input, contact }),
  });
  return parseJson(response);
}

export async function syncContactsFromDevice(
  contacts: Array<{ name: string; phone: string }>,
): Promise<{
  friends: Array<{
    threadId: string;
    displayName: string;
    phoneE164: string;
    rimvioId: string | null;
  }>;
  scanned: number;
  matched: number;
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/sync-contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ contacts }),
  });
  return parseJson(response);
}

export async function syncDmThreadsRemote(): Promise<
  Array<{ threadId: string; displayName: string; roomKind?: "dm" | "group" }>
> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/threads`, {
    credentials: "include",
  });
  const data = await parseJson<{
    threads: Array<{ threadId: string; displayName: string; roomKind?: "dm" | "group" }>;
  }>(response);
  const { writeGroupThreadsCache } = await import("@/lib/peer-chat/group-threads-cache");
  writeGroupThreadsCache(
    data.threads
      .filter((row) => row.roomKind === "group")
      .map((row) => ({
        peerThreadId: row.threadId,
        displayName: row.displayName,
      })),
  );
  return data.threads;
}
