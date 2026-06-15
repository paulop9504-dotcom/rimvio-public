import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { canReadBridgeExperience } from "@/lib/experience-bridge";
import { uploadBridgeCaptureMedia } from "@/lib/experience-bridge/bridge-media-server";
import { fetchExperienceBridgeState } from "@/lib/experience-bridge/server-bridge-store";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const eventId =
      typeof form.get("eventId") === "string" ? String(form.get("eventId")).trim() : "";
    const captureId =
      typeof form.get("captureId") === "string"
        ? String(form.get("captureId")).trim()
        : "";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "사진 또는 동영상 파일이 필요해요." }, { status: 400 });
    }
    if (!eventId || !captureId) {
      return NextResponse.json({ error: "eventId and captureId required." }, { status: 400 });
    }

    const supabase = await createClient();
    const bridgeState = await fetchExperienceBridgeState(supabase, eventId);
    if (!bridgeState) {
      return NextResponse.json({ error: "Bridge not found." }, { status: 404 });
    }
    if (
      !canReadBridgeExperience({
        viewerUserId: userId,
        participants: bridgeState.participants,
      })
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (!supabaseUrl) {
      return NextResponse.json({ error: "Supabase URL missing." }, { status: 503 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const { mediaUrl } = await uploadBridgeCaptureMedia(supabase, {
      userId,
      eventId,
      captureId,
      supabaseUrl,
      bytes,
      contentType: file.type || "image/jpeg",
    });

    return NextResponse.json({ mediaUrl });
  } catch (error) {
    const message = extractErrorMessage(error, "미디어 업로드에 실패했어요.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
