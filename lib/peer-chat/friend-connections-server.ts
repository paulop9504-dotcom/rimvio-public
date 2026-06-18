import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildDmThreadId,
  extractOtherUserIdFromDmThread,
  isDmThreadId,
} from "@/lib/peer-chat/server-peer-chat";
import {
  deriveBubbleState,
  type BubbleState,
  type SocialBubblePeer,
} from "@/lib/social/bubble-state";
import { purgeAfterIso, isPurgeDue } from "@/lib/context/hub-room-retention";
import { loadFriendProfilesMap } from "@/lib/peer-chat/load-friend-profiles-map";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { markGroupThreadMemberRead } from "@/lib/peer-chat/group-read-receipt";
import { touchPeerReadReceiptForSender } from "@/lib/peer-chat/peer-read-receipt";
import type { Database } from "@/types/database";

export const ARCHIVE_RETENTION_DAYS = 7;

export type FriendConnectionRow = {
  user_id: string;
  friend_id: string;
  thread_id: string;
  is_pinned: boolean;
  pin_slot: number | null;
  interaction_score: number;
  last_interaction_at: string;
  last_read_at: string;
  peer_last_read_at: string | null;
  last_inbound_at: string | null;
  unread_count: number;
  messages_purge_after: string | null;
};

export async function upsertFriendConnection(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    friendId: string;
    threadId: string;
    bumpInteraction?: boolean;
  },
) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("friend_connections")
    .select("is_pinned, pin_slot, interaction_score")
    .eq("user_id", input.userId)
    .eq("friend_id", input.friendId)
    .maybeSingle();

  const { error } = await supabase.from("friend_connections").upsert(
    {
      user_id: input.userId,
      friend_id: input.friendId,
      thread_id: input.threadId,
      is_pinned: existing?.is_pinned ?? false,
      pin_slot: existing?.pin_slot ?? null,
      interaction_score: input.bumpInteraction
        ? (existing?.interaction_score ?? 0) + 1
        : (existing?.interaction_score ?? 0),
      last_interaction_at: now,
      updated_at: now,
    },
    { onConflict: "user_id,friend_id" },
  );

  if (error) {
    throw error;
  }
}

export async function recordInboundMessage(
  supabase: SupabaseClient<Database>,
  input: { threadId: string; senderUserId: string },
) {
  if (!isDmThreadId(input.threadId)) {
    return;
  }

  const { data: members, error: memberError } = await supabase
    .from("peer_thread_members")
    .select("user_id")
    .eq("thread_id", input.threadId);

  if (memberError) {
    throw memberError;
  }

  const recipientId = (members ?? [])
    .map((m) => m.user_id as string)
    .find((id) => id !== input.senderUserId);

  if (!recipientId) {
    return;
  }

  const now = new Date().toISOString();
  const { data: row } = await supabase
    .from("friend_connections")
    .select("unread_count, interaction_score")
    .eq("user_id", recipientId)
    .eq("thread_id", input.threadId)
    .maybeSingle();

  if (!row) {
    const friendId = extractOtherUserIdFromDmThread(
      input.threadId,
      recipientId,
    );
    if (friendId) {
      await upsertFriendConnection(supabase, {
        userId: recipientId,
        friendId,
        threadId: input.threadId,
      });
    }
  }

  await supabase
    .from("friend_connections")
    .update({
      unread_count: (row?.unread_count ?? 0) + 1,
      last_inbound_at: now,
      last_interaction_at: now,
      interaction_score: (row?.interaction_score ?? 0) + 1,
      updated_at: now,
    })
    .eq("user_id", recipientId)
    .eq("thread_id", input.threadId);
}

export async function markThreadRead(
  supabase: SupabaseClient<Database>,
  input: { userId: string; threadId: string },
) {
  if (isGroupThreadId(input.threadId)) {
    await markGroupThreadMemberRead(supabase, {
      threadId: input.threadId,
      userId: input.userId,
    });
    return;
  }

  const now = new Date().toISOString();
  await supabase
    .from("friend_connections")
    .update({
      unread_count: 0,
      last_read_at: now,
      updated_at: now,
    })
    .eq("user_id", input.userId)
    .eq("thread_id", input.threadId);

  await touchPeerReadReceiptForSender(supabase, {
    readerUserId: input.userId,
    threadId: input.threadId,
    readAt: now,
  });
}

export async function pinFriend(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    friendId: string;
    pinSlot: number;
  },
): Promise<FriendConnectionRow> {
  if (input.pinSlot < 0 || input.pinSlot > 4) {
    throw new Error("pin_slot must be 0..4");
  }

  const threadId = buildDmThreadId(input.userId, input.friendId);
  await upsertFriendConnection(supabase, {
    userId: input.userId,
    friendId: input.friendId,
    threadId,
  });

  const { data: slotTaken } = await supabase
    .from("friend_connections")
    .select("friend_id")
    .eq("user_id", input.userId)
    .eq("is_pinned", true)
    .eq("pin_slot", input.pinSlot)
    .maybeSingle();

  if (slotTaken && slotTaken.friend_id !== input.friendId) {
    throw new Error("slot_taken");
  }

  const { data: pinnedRows } = await supabase
    .from("friend_connections")
    .select("friend_id")
    .eq("user_id", input.userId)
    .eq("is_pinned", true);

  const otherPins = (pinnedRows ?? []).filter(
    (r) => (r.friend_id as string) !== input.friendId,
  );
  if (otherPins.length >= 5) {
    throw new Error("pin_limit");
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("friend_connections")
    .update({
      is_pinned: true,
      pin_slot: input.pinSlot,
      thread_id: threadId,
      messages_purge_after: null,
      last_interaction_at: now,
      updated_at: now,
    })
    .eq("user_id", input.userId)
    .eq("friend_id", input.friendId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as FriendConnectionRow;
}

export async function unpinFriend(
  supabase: SupabaseClient<Database>,
  input: { userId: string; friendId: string },
): Promise<FriendConnectionRow> {
  const now = new Date().toISOString();
  const purgeAfter = purgeAfterIso(now);

  const { data, error } = await supabase
    .from("friend_connections")
    .update({
      is_pinned: false,
      pin_slot: null,
      messages_purge_after: purgeAfter,
      updated_at: now,
    })
    .eq("user_id", input.userId)
    .eq("friend_id", input.friendId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as FriendConnectionRow;
}

function rowToSocialPeer(
  row: FriendConnectionRow,
  profile: {
    display_name: string | null;
    rimvio_id: string | null;
    avatar_url: string | null;
  } | null,
): SocialBubblePeer {
  const bubbleState: BubbleState = deriveBubbleState({
    unreadCount: row.unread_count,
    lastInboundAt: row.last_inbound_at,
  });

  return {
    friendId: row.friend_id,
    threadId: row.thread_id,
    displayName:
      profile?.display_name?.trim() ||
      profile?.rimvio_id ||
      "친구",
    rimvioId: profile?.rimvio_id ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    bubbleState,
    isPinned: row.is_pinned,
    pinSlot: row.pin_slot,
    unreadCount: row.unread_count,
    lastInteractionAt: row.last_interaction_at,
    messagesPurgeAfter: row.messages_purge_after,
  };
}

export async function listSocialLayer(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ pinned: SocialBubblePeer[]; archive: SocialBubblePeer[] }> {
  const { data, error } = await supabase
    .from("friend_connections")
    .select("*")
    .eq("user_id", userId)
    .order("last_interaction_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as FriendConnectionRow[];
  const friendIds = rows.map((r) => r.friend_id);
  const profiles = await loadFriendProfilesMap(supabase, friendIds);

  const pinned = rows
    .filter((r) => r.is_pinned)
    .sort((a, b) => (a.pin_slot ?? 99) - (b.pin_slot ?? 99))
    .map((r) => rowToSocialPeer(r, profiles.get(r.friend_id) ?? null));

  const archive = rows
    .filter((r) => !r.is_pinned)
    .map((r) => rowToSocialPeer(r, profiles.get(r.friend_id) ?? null));

  return { pinned, archive };
}

/** Unpinned rooms past retention — delete messages only, keep friend_connections. */
export async function purgeExpiredArchiveMessages(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const now = Date.now();
  const { data: due } = await supabase
    .from("friend_connections")
    .select("thread_id, messages_purge_after")
    .eq("user_id", userId)
    .eq("is_pinned", false)
    .not("messages_purge_after", "is", null);

  let purged = 0;
  for (const row of due ?? []) {
    const after = row.messages_purge_after as string | null;
    if (!after || !isPurgeDue(after, now)) {
      continue;
    }
    const threadId = row.thread_id as string;
    await supabase.from("peer_messages").delete().eq("thread_id", threadId);
    await supabase
      .from("friend_connections")
      .update({
        messages_purge_after: null,
        unread_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("thread_id", threadId);
    purged += 1;
  }
  return purged;
}
