import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import { friendContactErrorMessage } from "@/lib/peer-chat/friend-contact-errors";
import { uploadPeerChatImage } from "@/lib/peer-chat/peer-chat-image-server";
import { resolvePeerThreadIdForSend } from "@/lib/peer-chat/resolve-canonical-peer-thread";
import {
  deleteSharedGlobePin,
  insertSharedGlobePin,
  listSharedGlobePinsForThread,
  updateSharedGlobePin,
} from "@/lib/peer-chat/server-globe-pins";
import { ensurePeerThread } from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

type GlobePinPostBody = {
  lat?: number;
  lng?: number;
  placeLabel?: string;
  displayName?: string;
  note?: string;
  capturedAtIso?: string;
};

type GlobePinPatchBody = {
  messageId?: string;
  placeLabel?: string;
  note?: string | null;
};

type GlobePinDeleteBody = {
  messageId?: string;
};

function readNumberField(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readStringField(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { threadId } = await context.params;
  const decoded = decodeURIComponent(threadId);

  try {
    const supabase = await createClient();
    const resolvedThreadId = await resolvePeerThreadIdForSend(supabase, {
      userId,
      threadId: decoded,
    });
    const pins = await listSharedGlobePinsForThread(supabase, resolvedThreadId);
    return NextResponse.json({ pins, threadId: resolvedThreadId });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to load shared globe pins.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { threadId } = await context.params;
  const decoded = decodeURIComponent(threadId);

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let body: GlobePinPostBody = {};
    let imageFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const lat = readNumberField(form.get("lat"));
      const lng = readNumberField(form.get("lng"));
      body = {
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        placeLabel: readStringField(form.get("placeLabel")),
        displayName: readStringField(form.get("displayName")),
        note: readStringField(form.get("note")),
        capturedAtIso: readStringField(form.get("capturedAtIso")),
      };
      const file = form.get("file");
      imageFile = file instanceof File ? file : null;
    } else {
      body = (await request.json()) as GlobePinPostBody;
    }

    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      return NextResponse.json({ error: "lat and lng required." }, { status: 400 });
    }

    const supabase = await createClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const resolvedThreadId = await resolvePeerThreadIdForSend(supabase, {
      userId,
      threadId: decoded,
      displayName: body.displayName,
    });

    await ensurePeerThread(supabase, {
      threadId: resolvedThreadId,
      displayName: body.displayName?.trim() || "친구",
      userId,
    });

    let imageUrl: string | null = null;
    if (imageFile) {
      if (!supabaseUrl) {
        return NextResponse.json({ error: "Supabase URL missing." }, { status: 503 });
      }
      const bytes = Buffer.from(await imageFile.arrayBuffer());
      const uploaded = await uploadPeerChatImage(supabase, {
        userId,
        threadId: resolvedThreadId,
        supabaseUrl,
        bytes,
        contentType: imageFile.type || "image/jpeg",
      });
      imageUrl = uploaded.imageUrl;
    }

    const { pin } = await insertSharedGlobePin(supabase, {
      threadId: resolvedThreadId,
      senderUserId: userId,
      senderDisplayName: body.displayName?.trim() || "나",
      lat: body.lat,
      lng: body.lng,
      placeLabel: body.placeLabel?.trim() || "이곳",
      note: body.note,
      capturedAtIso: body.capturedAtIso,
      imageUrl,
      mediaKind: imageUrl ? "photo" : null,
    });

    return NextResponse.json({ pin, threadId: resolvedThreadId });
  } catch (error) {
    const raw = extractErrorMessage(error, "Failed to place shared globe pin.");
    const message = friendContactErrorMessage(raw);
    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { threadId } = await context.params;
  const decoded = decodeURIComponent(threadId);

  let body: GlobePinPatchBody = {};
  try {
    body = (await request.json()) as GlobePinPatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const messageId = body.messageId?.trim();
  if (!messageId) {
    return NextResponse.json({ error: "messageId required." }, { status: 400 });
  }
  if (body.placeLabel === undefined && body.note === undefined) {
    return NextResponse.json({ error: "placeLabel or note required." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const resolvedThreadId = await resolvePeerThreadIdForSend(supabase, {
      userId,
      threadId: decoded,
    });
    const pin = await updateSharedGlobePin(supabase, {
      threadId: resolvedThreadId,
      messageId,
      callerUserId: userId,
      placeLabel: body.placeLabel,
      note: body.note,
    });
    return NextResponse.json({ pin, threadId: resolvedThreadId });
  } catch (error) {
    const raw = extractErrorMessage(error, "Failed to update shared globe pin.");
    const message = friendContactErrorMessage(raw);
    const status = raw.startsWith("not_found")
      ? 404
      : raw.startsWith("forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message, message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { threadId } = await context.params;
  const decoded = decodeURIComponent(threadId);

  let body: GlobePinDeleteBody = {};
  try {
    body = (await request.json()) as GlobePinDeleteBody;
  } catch {
    return NextResponse.json({ error: "messageId required." }, { status: 400 });
  }

  const messageId = body.messageId?.trim();
  if (!messageId) {
    return NextResponse.json({ error: "messageId required." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const resolvedThreadId = await resolvePeerThreadIdForSend(supabase, {
      userId,
      threadId: decoded,
    });
    await deleteSharedGlobePin(supabase, {
      threadId: resolvedThreadId,
      messageId,
      callerUserId: userId,
    });
    return NextResponse.json({ ok: true, threadId: resolvedThreadId, messageId });
  } catch (error) {
    const raw = extractErrorMessage(error, "Failed to delete shared globe pin.");
    const message = friendContactErrorMessage(raw);
    const status = raw.startsWith("not_found") ? 404 : 500;
    return NextResponse.json({ error: message, message }, { status });
  }
}
