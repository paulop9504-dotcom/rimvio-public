import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildGlobePinSystemBody,
  isPeerGlobePinPayload,
  type PeerGlobePinPayload,
  type SharedGlobePin,
} from "@/lib/peer-chat/globe-pin-types";
import { assertCallerIsThreadMember } from "@/lib/peer-chat/peer-public-profile";
import { listSharedGlobePinsFromMessages } from "@/lib/peer-chat/project-thread-globe-pins";
import {
  insertPeerMessage,
  listPeerMessages,
} from "@/lib/peer-chat/server-peer-chat";
import type { Database } from "@/types/database";

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

export function validateGlobePinCoords(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || lat < LAT_MIN || lat > LAT_MAX) {
    throw new Error("invalid_lat:위도가 올바르지 않아요.");
  }
  if (!Number.isFinite(lng) || lng < LNG_MIN || lng > LNG_MAX) {
    throw new Error("invalid_lng:경도가 올바르지 않아요.");
  }
}

export async function listSharedGlobePinsForThread(
  supabase: SupabaseClient<Database>,
  threadId: string,
): Promise<SharedGlobePin[]> {
  const rows = await listPeerMessages(supabase, threadId);
  return listSharedGlobePinsFromMessages(rows);
}

export async function insertSharedGlobePin(
  supabase: SupabaseClient<Database>,
  input: {
    threadId: string;
    senderUserId: string;
    senderDisplayName: string;
    lat: number;
    lng: number;
    placeLabel: string;
    note?: string | null;
    capturedAtIso?: string;
    imageUrl?: string | null;
    mediaKind?: PeerGlobePinPayload["mediaKind"];
  },
): Promise<{ pin: SharedGlobePin; body: string }> {
  validateGlobePinCoords(input.lat, input.lng);

  const placeLabel = input.placeLabel.trim() || "이곳";
  const senderDisplayName = input.senderDisplayName.trim() || "친구";
  const capturedAtIso = input.capturedAtIso ?? new Date().toISOString();

  const payload: PeerGlobePinPayload = {
    kind: "globe_pin",
    pinId: crypto.randomUUID(),
    lat: input.lat,
    lng: input.lng,
    placeLabel,
    senderDisplayName,
    capturedAtIso,
    note: input.note?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    mediaKind: input.mediaKind ?? (input.imageUrl ? "photo" : null),
  };

  const body = buildGlobePinSystemBody({
    senderDisplayName,
    placeLabel,
    hasPhoto: Boolean(payload.imageUrl),
  });
  const row = await insertPeerMessage(supabase, {
    threadId: input.threadId,
    senderUserId: input.senderUserId,
    body,
    messageType: "system",
    aiPayload:
      payload as unknown as import("@/lib/chat-room/types").AiMessagePayload,
  });

  const pin: SharedGlobePin = {
    messageId: row.id,
    peerThreadId: row.thread_id,
    senderUserId: row.sender_user_id,
    sentAt: row.created_at,
    payload,
  };

  return { pin, body };
}

export async function updateSharedGlobePin(
  supabase: SupabaseClient<Database>,
  input: {
    threadId: string;
    messageId: string;
    callerUserId: string;
    placeLabel?: string;
    note?: string | null;
  },
): Promise<SharedGlobePin> {
  await assertCallerIsThreadMember(
    supabase,
    input.threadId,
    input.callerUserId,
  );

  const { data: row, error: fetchError } = await supabase
    .from("peer_messages")
    .select("id, thread_id, sender_user_id, created_at, message_type, ai_payload")
    .eq("id", input.messageId)
    .eq("thread_id", input.threadId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }
  if (!row) {
    throw new Error("not_found:핀을 찾을 수 없어요.");
  }
  if (row.sender_user_id !== input.callerUserId) {
    throw new Error("forbidden:내가 박은 핀만 고칠 수 있어요.");
  }
  if (row.message_type !== "system" || !isPeerGlobePinPayload(row.ai_payload)) {
    throw new Error("not_globe_pin:이 핀은 고칠 수 없어요.");
  }

  const payload = row.ai_payload;
  const placeLabel =
    input.placeLabel !== undefined
      ? input.placeLabel.trim() || "이곳"
      : payload.placeLabel;
  const note =
    input.note !== undefined ? input.note?.trim() || null : payload.note ?? null;

  const nextPayload: PeerGlobePinPayload = {
    ...payload,
    placeLabel,
    note,
  };

  const body = buildGlobePinSystemBody({
    senderDisplayName: payload.senderDisplayName,
    placeLabel,
    hasPhoto: Boolean(payload.imageUrl),
  });

  const { error: updateError } = await supabase
    .from("peer_messages")
    .update({
      body,
      ai_payload:
        nextPayload as unknown as import("@/lib/chat-room/types").AiMessagePayload,
    })
    .eq("id", input.messageId)
    .eq("thread_id", input.threadId);

  if (updateError) {
    throw updateError;
  }

  return {
    messageId: row.id,
    peerThreadId: row.thread_id,
    senderUserId: row.sender_user_id,
    sentAt: row.created_at,
    payload: nextPayload,
  };
}

export async function deleteSharedGlobePin(
  supabase: SupabaseClient<Database>,
  input: {
    threadId: string;
    messageId: string;
    callerUserId: string;
  },
): Promise<void> {
  await assertCallerIsThreadMember(
    supabase,
    input.threadId,
    input.callerUserId,
  );

  const { data: row, error: fetchError } = await supabase
    .from("peer_messages")
    .select("id, thread_id, message_type, ai_payload")
    .eq("id", input.messageId)
    .eq("thread_id", input.threadId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }
  if (!row) {
    throw new Error("not_found:핀을 찾을 수 없어요.");
  }
  if (row.message_type !== "system" || !isPeerGlobePinPayload(row.ai_payload)) {
    throw new Error("not_globe_pin:이 핀은 삭제할 수 없어요.");
  }

  const { error: deleteError } = await supabase
    .from("peer_messages")
    .delete()
    .eq("id", input.messageId)
    .eq("thread_id", input.threadId);

  if (deleteError) {
    throw deleteError;
  }
}
