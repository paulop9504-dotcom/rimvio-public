import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import {
  removeUserProfileAvatar,
  uploadUserProfileAvatar,
} from "@/lib/peer-chat/profile-avatar-server";
import { readUserProfile, syncUserProfileFromAuth } from "@/lib/peer-chat/server-peer-chat";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "사진 파일이 필요해요." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (!supabaseUrl) {
      return NextResponse.json({ error: "Supabase URL missing." }, { status: 503 });
    }

    const supabase = await createClient();
    await syncUserProfileFromAuth(supabase, {
      userId,
      email: auth.user?.email,
      displayName:
        (auth.user?.user_metadata?.full_name as string | undefined) ||
        auth.user?.email?.split("@")[0] ||
        null,
    });

    const avatarUrl = await uploadUserProfileAvatar(supabase, {
      userId,
      supabaseUrl,
      bytes,
      contentType: file.type || "image/jpeg",
    });

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "프로필 사진 업로드에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
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

  try {
    const supabase = await createClient();
    await removeUserProfileAvatar(supabase, userId);
    const profile = await readUserProfile(supabase, userId);
    return NextResponse.json({ ok: true, avatarUrl: profile?.avatar_url ?? null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "프로필 사진 삭제에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
