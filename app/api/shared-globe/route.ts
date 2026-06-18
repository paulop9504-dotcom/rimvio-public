import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import { resolvePeerThreadIdForSend } from "@/lib/peer-chat/resolve-canonical-peer-thread";
import { listSharedGlobePinsForThread } from "@/lib/peer-chat/server-globe-pins";
import {
  createEmptySharedGlobe,
  resolveSharedGlobeProjection,
  resolveSharedGlobeWithAutoCreate,
} from "@/lib/shared-globe";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type SharedGlobePostBody = {
  action?: "project" | "create" | "auto_create";
  threadId?: string;
  primaryEvent?: EventCandidate;
  displayName?: string;
  force?: boolean;
};

function isEventCandidate(value: unknown): value is EventCandidate {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<EventCandidate>;
  return typeof row.id === "string" && typeof row.title === "string";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SharedGlobePostBody;
  const action = body.action ?? "project";
  const threadId = body.threadId?.trim();
  const primaryEvent = body.primaryEvent;

  if (!threadId || !isEventCandidate(primaryEvent)) {
    return NextResponse.json(
      { error: "threadId and primaryEvent required." },
      { status: 400 },
    );
  }

  let globePins: Awaited<ReturnType<typeof listSharedGlobePinsForThread>> = [];
  let resolvedThreadId = threadId;

  if (isSupabaseConfigured()) {
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
      resolvedThreadId = await resolvePeerThreadIdForSend(supabase, {
        userId,
        threadId,
        displayName: body.displayName,
      });
      globePins = await listSharedGlobePinsForThread(supabase, resolvedThreadId);
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to load shared globe.");
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    if (action === "create") {
      const created = createEmptySharedGlobe({
        primaryEvent,
        threadId: resolvedThreadId,
        ownerDisplayName: body.displayName?.trim() || "나",
      });
      const projection = resolveSharedGlobeProjection({
        primaryEvent: { ...primaryEvent, metadata: created.metadataPatch },
        threadId: resolvedThreadId,
        globePins,
      });
      return NextResponse.json({
        ...projection,
        created: created.created,
        metadataPatch: created.metadataPatch,
        threadId: resolvedThreadId,
      });
    }

    if (action === "auto_create") {
      const auth = await requireAuthUser();
      const userId = "response" in auth ? undefined : auth.user?.id;
      const result = resolveSharedGlobeWithAutoCreate({
        primaryEvent,
        threadId: resolvedThreadId,
        globePins,
        ownerDisplayName: body.displayName?.trim() || "나",
        ownerUserId: userId,
      });
      return NextResponse.json({
        experienceRoom: result.experienceRoom,
        globe: result.globe,
        layer: result.layer,
        autoCreate: result.autoCreate,
        created: Boolean(result.createdGlobe?.created),
        metadataPatch: result.createdGlobe?.metadataPatch ?? null,
        threadId: resolvedThreadId,
      });
    }

    const projection = resolveSharedGlobeProjection({
      primaryEvent,
      threadId: resolvedThreadId,
      globePins,
    });

    return NextResponse.json({
      ...projection,
      threadId: resolvedThreadId,
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to project shared globe.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
