import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { validateRimvioId } from "@/lib/peer-chat/rimvio-id";
import {
  readUserProfile,
  setUserRimvioId,
  syncUserProfileFromAuth,
} from "@/lib/peer-chat/server-peer-chat";
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
    const body = (await request.json()) as { rimvioId?: string };
    const parsed = validateRimvioId(body.rimvioId ?? "");
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.reason }, { status: 400 });
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

    await setUserRimvioId(supabase, {
      userId,
      rimvioId: parsed.id,
      displayName:
        (auth.user?.user_metadata?.full_name as string | undefined) ||
        null,
    });

    return NextResponse.json({ rimvioId: parsed.id, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save ID.";
    const status =
      message.includes("unique") || message.includes("duplicate") ? 409 : 500;
    return NextResponse.json(
      {
        error:
          status === 409 ? "이미 사용 중인 아이디예요. 다른 ID를 골라 주세요." : message,
      },
      { status },
    );
  }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ rimvioId: null });
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ rimvioId: null }, { status: 401 });
  }

  const supabase = await createClient();
  const profile = await readUserProfile(supabase, userId);
  return NextResponse.json({ rimvioId: profile?.rimvio_id ?? null });
}
