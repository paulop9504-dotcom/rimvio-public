import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureDmThreadPartnerMember,
} from "@/lib/peer-chat/dm-friend-add-server";
import { normalizeEmail } from "@/lib/peer-chat/email";
import { ensureRimvioUserProfile } from "@/lib/peer-chat/ensure-user-profile";
import { PEER_MESSAGE_IMAGE_PLACEHOLDER } from "@/lib/peer-chat/peer-chat-image-constants";
import {
  buildPeerMessageInsertRow,
  isMissingPeerMessageImageColumnError,
  PEER_MESSAGE_LIST_COLUMNS,
} from "@/lib/peer-chat/peer-message-columns";
import { aiModeForRoomKind } from "@/lib/chat-room/types";
import {
  buildGroupThreadId,
  isGroupThreadId,
} from "@/lib/peer-chat/group-thread";
import {
  assertCallerIsThreadMember,
  fetchPeerPublicProfileByUserId,
  type PeerPublicProfile,
} from "@/lib/peer-chat/peer-public-profile";
import { assertCallerCanAccessPeerThread } from "@/lib/peer-chat/caller-peer-thread-access";
import type { ListedPeerThread, PeerMessageRow, PeerThreadRow } from "@/lib/peer-chat/types";
import type { Database } from "@/types/database";

const MESSAGE_LIMIT = 200;

const DM_SEP = "__";

/** Stable DM room id for two Rimvio accounts (UUID-safe delimiter). */
export function buildDmThreadId(userIdA: string, userIdB: string): string {
  const [a, b] = [userIdA, userIdB].sort();
  return `peer-dm-${a}${DM_SEP}${b}`;
}

export function isDmThreadId(threadId: string): boolean {
  return threadId.startsWith("peer-dm-") && threadId.includes(DM_SEP);
}

export function extractOtherUserIdFromDmThread(
  threadId: string,
  currentUserId: string,
): string | null {
  if (!isDmThreadId(threadId)) {
    return null;
  }
  const body = threadId.slice("peer-dm-".length);
  const [a, b] = body.split(DM_SEP);
  if (a === currentUserId) {
    return b ?? null;
  }
  if (b === currentUserId) {
    return a ?? null;
  }
  return null;
}

export async function ensureDmThreadBetweenUsers(
  supabase: SupabaseClient<Database>,
  input: {
    callerUserId: string;
    otherUserId: string;
    callerDisplayName: string;
    otherDisplayName: string;
  },
): Promise<{ thread: PeerThreadRow; threadId: string }> {
  const threadId = buildDmThreadId(input.callerUserId, input.otherUserId);
  const { thread } = await ensurePeerThread(supabase, {
    threadId,
    displayName: input.callerDisplayName,
    userId: input.callerUserId,
  });
  await ensureDmThreadPartnerMember(supabase, {
    threadId,
    partnerUserId: input.otherUserId,
  });
  return { thread, threadId };
}

export type UserProfileRecord = {
  phone_e164: string | null;
  email_lower: string | null;
  rimvio_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export async function lookupUserIdByPhone(
  supabase: SupabaseClient<Database>,
  phoneE164: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("lookup_user_id_by_phone", {
    p_phone_e164: phoneE164,
  });

  if (error) {
    throw error;
  }

  return (data as string | null) ?? null;
}

export async function lookupUserIdByEmail(
  supabase: SupabaseClient<Database>,
  emailLower: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("lookup_user_id_by_email", {
    p_email_lower: emailLower,
  });

  if (error) {
    throw error;
  }

  return (data as string | null) ?? null;
}

export async function lookupUserIdByRimvioId(
  supabase: SupabaseClient<Database>,
  rimvioId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("lookup_user_id_by_rimvio_id", {
    p_rimvio_id: rimvioId,
  });

  if (error) {
    throw error;
  }

  return (data as string | null) ?? null;
}

export async function upsertUserProfile(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    phoneE164?: string | null;
    emailLower?: string | null;
    rimvioId?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  },
) {
  const existing = await readUserProfile(supabase, input.userId);
  const phone = input.phoneE164 ?? existing?.phone_e164 ?? null;
  const email = input.emailLower ?? existing?.email_lower ?? null;
  const rimvioId = input.rimvioId ?? existing?.rimvio_id ?? null;
  const avatarUrl =
    input.avatarUrl !== undefined
      ? input.avatarUrl
      : (existing?.avatar_url ?? null);

  if (!phone && !email && !rimvioId) {
    throw new Error("Phone, email, or Rimvio ID required for profile.");
  }

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: input.userId,
      phone_e164: phone,
      email_lower: email,
      rimvio_id: rimvioId,
      display_name:
        input.displayName?.trim() || existing?.display_name || null,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

const CONTACT_MATCH_LIMIT = 400;

export type MatchedContactUser = {
  user_id: string;
  phone_e164: string;
  display_name: string | null;
  rimvio_id: string | null;
};

export async function matchUsersByPhones(
  supabase: SupabaseClient<Database>,
  phones: string[],
): Promise<MatchedContactUser[]> {
  const unique = [...new Set(phones)].slice(0, CONTACT_MATCH_LIMIT);
  if (unique.length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc("match_users_by_phones", {
    p_phones: unique,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as MatchedContactUser[];
}

export async function registerFriendsFromPhoneContacts(
  supabase: SupabaseClient<Database>,
  input: {
    callerUserId: string;
    callerDisplayName: string;
    entries: Array<{ name: string; phoneE164: string }>;
  },
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
  const phones = input.entries.map((e) => e.phoneE164);
  const nameByPhone = new Map(
    input.entries.map((e) => [e.phoneE164, e.name] as const),
  );
  const matches = await matchUsersByPhones(supabase, phones);
  const friends: Array<{
    threadId: string;
    displayName: string;
    phoneE164: string;
    rimvioId: string | null;
  }> = [];

  for (const match of matches) {
    const displayName =
      nameByPhone.get(match.phone_e164)?.trim() ||
      match.display_name ||
      match.rimvio_id ||
      "친구";

    const { threadId } = await ensureDmThreadBetweenUsers(supabase, {
      callerUserId: input.callerUserId,
      otherUserId: match.user_id,
      callerDisplayName: displayName,
      otherDisplayName: input.callerDisplayName,
    });

    friends.push({
      threadId,
      displayName,
      phoneE164: match.phone_e164,
      rimvioId: match.rimvio_id,
    });
  }

  return {
    friends,
    scanned: input.entries.length,
    matched: friends.length,
  };
}

export async function setUserRimvioId(
  supabase: SupabaseClient<Database>,
  input: { userId: string; rimvioId: string; displayName?: string | null },
) {
  const existing = await readUserProfile(supabase, input.userId);
  await upsertUserProfile(supabase, {
    userId: input.userId,
    rimvioId: input.rimvioId,
    phoneE164: existing?.phone_e164 ?? null,
    emailLower: existing?.email_lower ?? null,
    displayName: input.displayName ?? existing?.display_name ?? null,
  });
}

export async function patchUserProfile(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    emailLower?: string | null;
    displayName?: string | null;
    phoneE164?: string | null;
    rimvioId?: string;
    avatarUrl?: string | null;
  },
): Promise<UserProfileRecord | null> {
  const existing = await readUserProfile(supabase, input.userId);
  const emailLower =
    input.emailLower ?? existing?.email_lower ?? null;
  const phoneE164 =
    input.phoneE164 !== undefined
      ? input.phoneE164
      : (existing?.phone_e164 ?? null);
  const rimvioId =
    input.rimvioId !== undefined
      ? input.rimvioId
      : (existing?.rimvio_id ?? null);
  const displayName =
    input.displayName !== undefined
      ? input.displayName
      : (existing?.display_name ?? null);
  const avatarUrl =
    input.avatarUrl !== undefined
      ? input.avatarUrl
      : (existing?.avatar_url ?? null);

  if (!phoneE164 && !emailLower && !rimvioId) {
    throw new Error(
      "Rimvio ID, 이메일, 또는 전화번호 중 하나는 남겨 두어야 합니다.",
    );
  }

  await upsertUserProfile(supabase, {
    userId: input.userId,
    phoneE164,
    emailLower,
    rimvioId,
    displayName,
    avatarUrl,
  });

  return readUserProfile(supabase, input.userId);
}

/** @deprecated use upsertUserProfile */
export async function upsertUserPhoneProfile(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    phoneE164: string;
    displayName?: string | null;
  },
) {
  return upsertUserProfile(supabase, {
    userId: input.userId,
    phoneE164: input.phoneE164,
    displayName: input.displayName,
  });
}

export async function readUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserProfileRecord | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("phone_e164, email_lower, rimvio_id, display_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserProfileRecord | null;
}

/** @deprecated use readUserProfile */
export async function readUserPhoneProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  return readUserProfile(supabase, userId);
}

export async function syncUserProfileFromAuth(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    email?: string | null;
    displayName?: string | null;
    phoneE164?: string | null;
  },
) {
  const emailLower = normalizeEmail(input.email ?? "");
  const existing = await readUserProfile(supabase, input.userId);

  if (!emailLower && !input.phoneE164 && !existing?.rimvio_id && !existing) {
    return null;
  }

  await upsertUserProfile(supabase, {
    userId: input.userId,
    phoneE164: input.phoneE164 ?? existing?.phone_e164 ?? null,
    emailLower: emailLower ?? existing?.email_lower ?? null,
    rimvioId: existing?.rimvio_id ?? null,
    displayName:
      input.displayName ??
      existing?.display_name ??
      null,
  });

  return readUserProfile(supabase, input.userId);
}

export async function listDmThreadsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<
  Array<{
    threadId: string;
    displayName: string;
    otherUserId: string | null;
  }>
> {
  const threads = await listPeerThreadsForUser(supabase, userId);
  return threads
    .filter((row) => row.roomKind === "dm")
    .map((row) => ({
      threadId: row.threadId,
      displayName: row.displayName,
      otherUserId: row.otherUserId,
    }));
}

export async function listPeerThreadsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ListedPeerThread[]> {
  const { data: memberships, error: memberError } = await supabase
    .from("peer_thread_members")
    .select("thread_id")
    .eq("user_id", userId);

  if (memberError) {
    throw memberError;
  }

  const threadIds = (memberships ?? [])
    .map((row) => row.thread_id as string)
    .filter((id) => isDmThreadId(id) || isGroupThreadId(id));

  if (threadIds.length === 0) {
    return [];
  }

  const { data: threads, error: threadError } = await supabase
    .from("peer_threads")
    .select("id, display_name, room_kind")
    .in("id", threadIds);

  if (threadError) {
    throw threadError;
  }

  return (threads ?? []).map((thread) => {
    const id = thread.id as string;
    const roomKind =
      (thread.room_kind as ListedPeerThread["roomKind"] | null) ??
      (isGroupThreadId(id) ? "group" : "dm");
    return {
      threadId: id,
      displayName: (thread.display_name as string) || (roomKind === "group" ? "단톡" : "친구"),
      roomKind,
      otherUserId: roomKind === "dm" ? extractOtherUserIdFromDmThread(id, userId) : null,
    };
  });
}

export async function ensureGroupPeerThread(
  supabase: SupabaseClient<Database>,
  input: {
    displayName: string;
    ownerUserId: string;
    memberUserIds: readonly string[];
    threadId?: string;
  },
): Promise<{ thread: PeerThreadRow; threadId: string; created: boolean }> {
  const displayName = input.displayName.trim() || "단톡";
  const ownerUserId = input.ownerUserId.trim();
  const threadId = input.threadId?.trim() || buildGroupThreadId();

  if (!isGroupThreadId(threadId)) {
    throw new Error("invalid_group:단톡 방 ID가 올바르지 않아요.");
  }

  const memberSet = new Set<string>([ownerUserId]);
  for (const raw of input.memberUserIds) {
    const id = raw.trim();
    if (id && id !== ownerUserId) {
      memberSet.add(id);
    }
  }

  if (memberSet.size < 2) {
    throw new Error("members_required:단톡은 친구 1명 이상을 선택해 주세요.");
  }

  for (const memberId of memberSet) {
    const ok = await ensureRimvioUserProfile(supabase, memberId);
    if (!ok) {
      throw new Error(
        "not_registered:가입한 Rimvio 사용자만 단톡에 초대할 수 있어요.",
      );
    }
  }

  const { data: existing, error: readError } = await supabase
    .from("peer_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (existing) {
    for (const memberId of memberSet) {
      await ensureMember(supabase, threadId, memberId);
    }
    return { thread: existing as PeerThreadRow, threadId, created: false };
  }

  const { data: created, error: insertError } = await supabase
    .from("peer_threads")
    .insert({
      id: threadId,
      owner_user_id: ownerUserId,
      display_name: displayName,
      room_kind: "group",
      ai_mode: aiModeForRoomKind("group"),
    })
    .select("*")
    .single();

  if (insertError) {
    const code =
      typeof insertError === "object" &&
      insertError !== null &&
      "code" in insertError
        ? String((insertError as { code?: string }).code)
        : "";
    if (code === "23505") {
      const { data: raced } = await supabase
        .from("peer_threads")
        .select("*")
        .eq("id", threadId)
        .maybeSingle();
      if (raced) {
        for (const memberId of memberSet) {
          await ensureMember(supabase, threadId, memberId);
        }
        return { thread: raced as PeerThreadRow, threadId, created: false };
      }
    }
    throw insertError;
  }

  for (const memberId of memberSet) {
    await ensureMember(supabase, threadId, memberId);
  }

  return { thread: created as PeerThreadRow, threadId, created: true };
}

/** Resolve friend DM thread ids → member user ids for group creation. */
export function resolveGroupMemberUserIds(input: {
  callerUserId: string;
  memberThreadIds: readonly string[];
}): string[] {
  const resolved = new Set<string>();
  for (const raw of input.memberThreadIds) {
    const threadId = raw.trim();
    if (!threadId) {
      continue;
    }
    if (isDmThreadId(threadId)) {
      const otherUserId = extractOtherUserIdFromDmThread(threadId, input.callerUserId);
      if (otherUserId) {
        resolved.add(otherUserId);
      }
      continue;
    }
    if (isGroupThreadId(threadId)) {
      throw new Error("invalid_member:단톡 방은 멤버로 추가할 수 없어요. 1:1 친구를 선택해 주세요.");
    }
  }
  return [...resolved];
}

export async function ensurePeerThread(
  supabase: SupabaseClient<Database>,
  input: {
    threadId: string;
    displayName: string;
    userId: string;
  },
): Promise<{ thread: PeerThreadRow; created: boolean }> {
  const { data: existing, error: readError } = await supabase
    .from("peer_threads")
    .select("*")
    .eq("id", input.threadId)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (existing) {
    await ensureDmThreadMembership(supabase, input.threadId, input.userId);
    return { thread: existing as PeerThreadRow, created: false };
  }

  if (isGroupThreadId(input.threadId)) {
    throw new Error(
      "group_create_only:단톡은 친구 ROOM에서 새로 만들 수 있어요.",
    );
  }

  if (!isDmThreadId(input.threadId)) {
    throw new Error(
      "not_registered:가입한 Rimvio 사용자만 대화할 수 있어요. 친구를 ID·번호·이메일로 추가해 주세요.",
    );
  }

  const otherUserId = extractOtherUserIdFromDmThread(input.threadId, input.userId);
  if (!otherUserId) {
    throw new Error(
      "not_registered:유효한 1:1 대화방이 아니에요. 친구를 다시 추가해 주세요.",
    );
  }

  const callerOk = await ensureRimvioUserProfile(supabase, input.userId);
  const otherOk = await ensureRimvioUserProfile(supabase, otherUserId);
  if (!callerOk || !otherOk) {
    throw new Error(
      "not_registered:가입한 Rimvio 사용자만 대화할 수 있어요. Google로 로그인한 뒤 다시 시도해 주세요.",
    );
  }

  const roomKind = "dm";

  const { data: created, error: insertError } = await supabase
    .from("peer_threads")
    .insert({
      id: input.threadId,
      owner_user_id: input.userId,
      display_name: input.displayName.trim() || "친구",
      room_kind: roomKind,
      ai_mode: "private",
    })
    .select("*")
    .single();

  if (insertError) {
    const code =
      typeof insertError === "object" &&
      insertError !== null &&
      "code" in insertError
        ? String((insertError as { code?: string }).code)
        : "";
    if (code === "23505") {
      const { data: raced } = await supabase
        .from("peer_threads")
        .select("*")
        .eq("id", input.threadId)
        .maybeSingle();
      if (raced) {
        await ensureDmThreadMembership(supabase, input.threadId, input.userId);
        return { thread: raced as PeerThreadRow, created: false };
      }
    }
    throw insertError;
  }

  await ensureDmThreadMembership(supabase, input.threadId, input.userId);

  return { thread: created as PeerThreadRow, created: true };
}

/** Caller + DM partner both in peer_thread_members (required for stable send/read). */
async function ensureDmThreadMembership(
  supabase: SupabaseClient<Database>,
  threadId: string,
  userId: string,
) {
  await ensureMember(supabase, threadId, userId);
  if (!isDmThreadId(threadId)) {
    return;
  }
  const partnerUserId = extractOtherUserIdFromDmThread(threadId, userId);
  if (!partnerUserId) {
    return;
  }
  try {
    await ensureDmThreadPartnerMember(supabase, {
      threadId,
      partnerUserId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Caller must join the DM thread first")) {
      await ensureMember(supabase, threadId, userId);
      try {
        await ensureDmThreadPartnerMember(supabase, {
          threadId,
          partnerUserId,
        });
      } catch {
        /* partner row is best-effort; caller membership is enough to send */
      }
      return;
    }
    console.warn("[peer-chat] ensureDmThreadPartnerMember skipped", message);
  }
}

async function ensureMember(
  supabase: SupabaseClient<Database>,
  threadId: string,
  userId: string,
) {
  const { error } = await supabase.from("peer_thread_members").upsert(
    {
      thread_id: threadId,
      user_id: userId,
    },
    { onConflict: "thread_id,user_id", ignoreDuplicates: true },
  );

  if (error) {
    throw error;
  }
}

export type PeerThreadMemberPublic = PeerPublicProfile & { isSelf: boolean };

export async function listPeerThreadMembers(
  supabase: SupabaseClient<Database>,
  input: { threadId: string; callerUserId: string },
): Promise<PeerThreadMemberPublic[]> {
  await assertCallerCanAccessPeerThread(
    supabase,
    input.threadId,
    input.callerUserId,
  );

  const { data: memberships, error } = await supabase
    .from("peer_thread_members")
    .select("user_id")
    .eq("thread_id", input.threadId);

  if (error) {
    throw error;
  }

  let userIds = (memberships ?? [])
    .map((row) => row.user_id as string)
    .filter(Boolean);

  if (userIds.length === 0 && isDmThreadId(input.threadId)) {
    const partnerId = extractOtherUserIdFromDmThread(
      input.threadId,
      input.callerUserId,
    );
    if (partnerId) {
      userIds = [input.callerUserId, partnerId];
    }
  }

  const profiles = await Promise.all(
    userIds.map(async (userId) => {
      const profile = await fetchPeerPublicProfileByUserId(supabase, userId);
      return {
        userId,
        displayName: profile?.displayName ?? null,
        rimvioId: profile?.rimvioId ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        emailLower: profile?.emailLower ?? null,
        isSelf: userId === input.callerUserId,
      } satisfies PeerThreadMemberPublic;
    }),
  );

  return profiles.sort((a, b) => {
    if (a.isSelf !== b.isSelf) {
      return a.isSelf ? -1 : 1;
    }
    const nameA = a.displayName?.trim() || a.rimvioId || a.userId;
    const nameB = b.displayName?.trim() || b.rimvioId || b.userId;
    return nameA.localeCompare(nameB, "ko");
  });
}

export async function addMembersToGroupThread(
  supabase: SupabaseClient<Database>,
  input: {
    threadId: string;
    callerUserId: string;
    memberUserIds: readonly string[];
  },
): Promise<{ addedUserIds: string[] }> {
  if (!isGroupThreadId(input.threadId)) {
    throw new Error("not_group:단톡 방에서만 멤버를 추가할 수 있어요.");
  }

  await assertCallerIsThreadMember(
    supabase,
    input.threadId,
    input.callerUserId,
  );

  const { data: memberships, error: memberError } = await supabase
    .from("peer_thread_members")
    .select("user_id")
    .eq("thread_id", input.threadId);

  if (memberError) {
    throw memberError;
  }

  const existing = new Set(
    (memberships ?? []).map((row) => row.user_id as string),
  );

  const addedUserIds: string[] = [];
  for (const raw of input.memberUserIds) {
    const memberId = raw.trim();
    if (!memberId || existing.has(memberId) || memberId === input.callerUserId) {
      continue;
    }
    const ok = await ensureRimvioUserProfile(supabase, memberId);
    if (!ok) {
      throw new Error(
        "not_registered:가입한 Rimvio 사용자만 단톡에 초대할 수 있어요.",
      );
    }
    await ensureMember(supabase, input.threadId, memberId);
    existing.add(memberId);
    addedUserIds.push(memberId);
  }

  return { addedUserIds };
}

export async function joinPeerThreadByInvite(
  supabase: SupabaseClient<Database>,
  input: { inviteCode: string; userId: string },
): Promise<PeerThreadRow> {
  const code = input.inviteCode.trim().toLowerCase();
  const { data: thread, error } = await supabase
    .from("peer_threads")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!thread) {
    throw new Error("Invalid invite code.");
  }

  await ensureMember(supabase, thread.id, input.userId);
  return thread as PeerThreadRow;
}

export async function listPeerMessages(
  supabase: SupabaseClient<Database>,
  threadId: string,
): Promise<PeerMessageRow[]> {
  const { data, error } = await supabase
    .from("peer_messages")
    .select(PEER_MESSAGE_LIST_COLUMNS)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(MESSAGE_LIMIT);

  if (error) {
    throw error;
  }

  return (data ?? []) as PeerMessageRow[];
}

export async function insertPeerMessage(
  supabase: SupabaseClient<Database>,
  input: {
    id?: string;
    threadId: string;
    senderUserId: string;
    body: string;
    imageUrl?: string | null;
    messageType?: import("@/lib/chat-room/types").RoomMessageType;
    aiPayload?: import("@/lib/chat-room/types").AiMessagePayload | null;
  },
): Promise<PeerMessageRow> {
  const imageUrl = input.imageUrl?.trim() || null;
  const insertRow = buildPeerMessageInsertRow(input);
  const body = String(insertRow.body ?? "");
  if (!body && !imageUrl) {
    throw new Error("Empty message.");
  }

  const { data, error } = await supabase
    .from("peer_messages")
    .insert(insertRow)
    .select(PEER_MESSAGE_LIST_COLUMNS)
    .single();

  if (error) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: string }).message === "string"
        ? (error as { message: string }).message
        : "";
    if (imageUrl && isMissingPeerMessageImageColumnError(message)) {
      throw new Error(
        "peer_image_column_missing:사진 DM은 DB 업데이트(031) 후에 보낼 수 있어요. 지금은 텍스트만 가능해요.",
      );
    }
    throw error;
  }

  return {
    ...(data as PeerMessageRow),
    image_url: imageUrl,
  };
}

export async function renameGroupThread(
  supabase: SupabaseClient<Database>,
  input: { threadId: string; displayName: string },
): Promise<string> {
  if (!isGroupThreadId(input.threadId)) {
    throw new Error("not_group:단톡 방만 이름을 바꿀 수 있어요.");
  }

  const { data, error } = await supabase.rpc("rimvio_rename_group_thread", {
    p_thread_id: input.threadId,
    p_display_name: input.displayName,
  });

  if (error) {
    throw error;
  }

  return String(data ?? input.displayName.trim());
}

export async function leaveGroupThread(
  supabase: SupabaseClient<Database>,
  input: { threadId: string; userId: string },
): Promise<void> {
  if (!isGroupThreadId(input.threadId)) {
    throw new Error("not_group:단톡 방에서만 나갈 수 있어요.");
  }

  await assertCallerIsThreadMember(
    supabase,
    input.threadId,
    input.userId,
  );

  const { error } = await supabase
    .from("peer_thread_members")
    .delete()
    .eq("thread_id", input.threadId)
    .eq("user_id", input.userId);

  if (error) {
    throw error;
  }
}

export async function readPeerThread(
  supabase: SupabaseClient<Database>,
  threadId: string,
): Promise<PeerThreadRow | null> {
  const { data, error } = await supabase
    .from("peer_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PeerThreadRow | null) ?? null;
}
