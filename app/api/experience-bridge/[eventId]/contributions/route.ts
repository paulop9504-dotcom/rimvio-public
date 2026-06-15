import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { canReadBridgeExperience } from "@/lib/experience-bridge";
import {
  deleteBridgeContribution,
  listBridgeContributions,
  upsertBridgeContribution,
} from "@/lib/experience-bridge/server-bridge-contributions";
import { toBridgeContributionWire } from "@/lib/experience-bridge/wire-bridge-response-dto";
import { deleteBridgeCaptureMediaFromStorage } from "@/lib/experience-bridge/bridge-media-server";
import { fetchExperienceBridgeState } from "@/lib/experience-bridge/server-bridge-store";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

function isPhotoOrVideoCapture(value: unknown): value is FeedCaptureFragment {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<FeedCaptureFragment>;
  return (
    typeof row.id === "string" &&
    (row.kind === "photo" || row.kind === "video") &&
    typeof row.capturedAtIso === "string"
  );
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const key = decodeURIComponent(eventId).trim();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ contributions: [] });
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
    const state = await fetchExperienceBridgeState(supabase, key);
    if (!state) {
      return NextResponse.json({ contributions: [] });
    }
    if (!canReadBridgeExperience({ viewerUserId: userId, participants: state.participants })) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const contributions = await listBridgeContributions(supabase, key);
    return NextResponse.json({
      contributions: contributions.map(toBridgeContributionWire),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to load bridge contributions.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type ContributionPostBody = {
  capture?: FeedCaptureFragment & {
    ownerUserId?: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const key = decodeURIComponent(eventId).trim();
  const body = (await request.json()) as ContributionPostBody;

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

  if (!isPhotoOrVideoCapture(body.capture)) {
    return NextResponse.json({ error: "Photo or video capture required." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const state = await fetchExperienceBridgeState(supabase, key);
    if (!state) {
      return NextResponse.json({ error: "Bridge not found." }, { status: 404 });
    }
    if (!canReadBridgeExperience({ viewerUserId: userId, participants: state.participants })) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const capture = {
      ...body.capture,
      ownerUserId: userId,
    };

    await upsertBridgeContribution(supabase, {
      bridgeEventId: key,
      contributorUserId: userId,
      capture,
    });

    return NextResponse.json({ ok: true, capture });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to save bridge contribution.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type ContributionDeleteBody = {
  captureId?: string;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const key = decodeURIComponent(eventId).trim();
  const body = (await request.json()) as ContributionDeleteBody;
  const captureId = body.captureId?.trim();

  if (!captureId) {
    return NextResponse.json({ error: "captureId required." }, { status: 400 });
  }

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
    const supabase = await createClient();
    const state = await fetchExperienceBridgeState(supabase, key);
    if (!state) {
      return NextResponse.json({ error: "Bridge not found." }, { status: 404 });
    }
    if (!canReadBridgeExperience({ viewerUserId: userId, participants: state.participants })) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { mediaUrl } = await deleteBridgeContribution(supabase, {
      bridgeEventId: key,
      contributorUserId: userId,
      captureId,
    });

    try {
      await deleteBridgeCaptureMediaFromStorage(supabase, { mediaUrl });
    } catch {
      // Row removed — stale storage is acceptable.
    }

    return NextResponse.json({ ok: true, captureId });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to delete bridge contribution.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
