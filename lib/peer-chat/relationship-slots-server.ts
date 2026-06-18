import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractOtherUserIdFromDmThread,
  isDmThreadId,
} from "@/lib/peer-chat/server-peer-chat";
import type { RelationshipFeedSlot } from "@/lib/social/relationship-slot-types";
import { loadFriendProfilesMap } from "@/lib/peer-chat/load-friend-profiles-map";
import type { Database } from "@/types/database";

export const FEED_SLOT_RETENTION_DAYS = 7;

export type RelationshipSlotRow = {
  id: string;
  user_id: string;
  room_id: string;
  friend_id: string;
  last_message: string | null;
  last_activity_at: string;
  unread_count: number;
  is_pinned: boolean;
  archived_at: string | null;
};

function previewMessage(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
}

/** Unpinned slots idle 7d → archived (removed from main feed). */
export async function archiveStaleFeedSlots(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const cutoff = new Date(
    Date.now() - FEED_SLOT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();

  await supabase
    .from("relationship_slots")
    .update({ archived_at: now, updated_at: now })
    .eq("user_id", userId)
    .eq("is_pinned", false)
    .is("archived_at", null)
    .lt("last_activity_at", cutoff);
}

export async function touchRelationshipSlotsOnMessage(
  supabase: SupabaseClient<Database>,
  input: {
    threadId: string;
    senderUserId: string;
    body: string;
    createdAt?: string;
  },
): Promise<void> {
  if (!isDmThreadId(input.threadId)) {
    return;
  }

  const friendId = extractOtherUserIdFromDmThread(
    input.threadId,
    input.senderUserId,
  );
  if (!friendId) {
    return;
  }

  // RLS allows insert/update only when auth.uid() = user_id — touch sender feed slot only.
  const now = input.createdAt ?? new Date().toISOString();
  const lastMessage = previewMessage(input.body);

  const { data: existing } = await supabase
    .from("relationship_slots")
    .select("unread_count, is_pinned, archived_at")
    .eq("user_id", input.senderUserId)
    .eq("room_id", input.threadId)
    .maybeSingle();

  const { error } = await supabase.from("relationship_slots").upsert(
    {
      user_id: input.senderUserId,
      room_id: input.threadId,
      friend_id: friendId,
      last_message: lastMessage || null,
      last_activity_at: now,
      unread_count: existing?.unread_count ?? 0,
      is_pinned: existing?.is_pinned ?? false,
      archived_at: null,
      updated_at: now,
    },
    { onConflict: "user_id,room_id" },
  );

  if (error) {
    throw error;
  }
}

export async function markFeedSlotRead(
  supabase: SupabaseClient<Database>,
  input: { userId: string; roomId: string },
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("relationship_slots")
    .update({ unread_count: 0, updated_at: now })
    .eq("user_id", input.userId)
    .eq("room_id", input.roomId);
}

export async function pinFeedSlot(
  supabase: SupabaseClient<Database>,
  input: { userId: string; roomId: string; pinned: boolean },
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("relationship_slots")
    .update({
      is_pinned: input.pinned,
      archived_at: null,
      updated_at: now,
    })
    .eq("user_id", input.userId)
    .eq("room_id", input.roomId);
}

function rowToFeedSlot(
  row: RelationshipSlotRow,
  profile: {
    display_name: string | null;
    rimvio_id: string | null;
    avatar_url: string | null;
  } | null,
): RelationshipFeedSlot {
  return {
    slotId: row.id,
    roomId: row.room_id,
    friendId: row.friend_id,
    displayName:
      profile?.display_name?.trim() ||
      profile?.rimvio_id ||
      "친구",
    rimvioId: profile?.rimvio_id ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    lastMessage: row.last_message,
    lastActivityAt: row.last_activity_at,
    unreadCount: row.unread_count,
    isPinned: row.is_pinned,
  };
}

/** Pull latest DM into feed slot (관계 버블 → DM 입장 시). */
export async function syncFeedSlotFromRoom(
  supabase: SupabaseClient<Database>,
  input: { userId: string; roomId: string },
): Promise<boolean> {
  if (!isDmThreadId(input.roomId)) {
    return false;
  }

  const friendId = extractOtherUserIdFromDmThread(input.roomId, input.userId);
  if (!friendId) {
    return false;
  }

  const { data: latest, error: msgError } = await supabase
    .from("peer_messages")
    .select("body, created_at, sender_user_id")
    .eq("thread_id", input.roomId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (msgError) {
    throw msgError;
  }

  if (!latest?.created_at) {
    return false;
  }

  const { data: conn } = await supabase
    .from("friend_connections")
    .select("unread_count, is_pinned, last_interaction_at")
    .eq("user_id", input.userId)
    .eq("thread_id", input.roomId)
    .maybeSingle();

  const { data: existing } = await supabase
    .from("relationship_slots")
    .select("unread_count, is_pinned, archived_at")
    .eq("user_id", input.userId)
    .eq("room_id", input.roomId)
    .maybeSingle();

  const now = new Date().toISOString();
  const activityAt =
    (conn?.last_interaction_at as string | undefined) ??
    (latest.created_at as string);

  const { error } = await supabase.from("relationship_slots").upsert(
    {
      user_id: input.userId,
      room_id: input.roomId,
      friend_id: friendId,
      last_message: previewMessage((latest.body as string) ?? ""),
      last_activity_at: activityAt,
      unread_count:
        (conn?.unread_count as number | undefined) ??
        (existing?.unread_count as number | undefined) ??
        0,
      is_pinned:
        (existing?.is_pinned as boolean | undefined) ??
        (conn?.is_pinned as boolean | undefined) ??
        false,
      archived_at: null,
      updated_at: now,
    },
    { onConflict: "user_id,room_id" },
  );

  if (error) {
    throw error;
  }

  return true;
}

/** DM threads with messages → feed slots (기존 대화 백필). */
export async function backfillFeedSlotsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data: memberships, error } = await supabase
    .from("peer_thread_members")
    .select("thread_id")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  for (const row of memberships ?? []) {
    const roomId = row.thread_id as string;
    if (!isDmThreadId(roomId)) {
      continue;
    }
    await syncFeedSlotFromRoom(supabase, { userId, roomId });
  }
}

export async function listRelationshipFeedSlots(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<RelationshipFeedSlot[]> {
  await backfillFeedSlotsForUser(supabase, userId);
  await archiveStaleFeedSlots(supabase, userId);

  const { data, error } = await supabase
    .from("relationship_slots")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("is_pinned", { ascending: false })
    .order("last_activity_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RelationshipSlotRow[];
  const friendIds = rows.map((r) => r.friend_id);
  const profiles = await loadFriendProfilesMap(supabase, friendIds);

  return rows.map((row) =>
    rowToFeedSlot(row, profiles.get(row.friend_id) ?? null),
  );
}

export function totalFeedSlotUnread(slots: RelationshipFeedSlot[]): number {
  return slots.reduce((sum, s) => sum + s.unreadCount, 0);
}
