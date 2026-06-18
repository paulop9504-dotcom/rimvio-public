import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  acceptBridgeInvite,
  buildBridgeSnapshot,
  buildHostParticipant,
  canReadBridgeExperience,
  createInitialBridgeState,
  inviteBridgeParticipant,
  mergeBridgeTimeline,
} from "@/lib/experience-bridge";
import {
  fetchExperienceBridgeState,
  updateBridgeEventSnapshot,
  upsertBridgeParticipantRow,
  upsertExperienceBridge,
} from "@/lib/experience-bridge/server-bridge-store";
import { listBridgeContributions } from "@/lib/experience-bridge/server-bridge-contributions";
import {
  toBridgeContributionWire,
  toBridgeStateWire,
  toBridgeTimelineWire,
} from "@/lib/experience-bridge/wire-bridge-response-dto";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";
import { listSharedGlobePinsForThread } from "@/lib/peer-chat/server-globe-pins";
import { callerCanAccessPeerThread } from "@/lib/peer-chat/caller-peer-thread-access";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

function isEventCandidate(value: unknown): value is EventCandidate {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<EventCandidate>;
  return typeof row.id === "string" && typeof row.title === "string";
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const key = decodeURIComponent(eventId).trim();
  if (!key) {
    return NextResponse.json({ error: "eventId required." }, { status: 400 });
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
      return NextResponse.json({ state: null, timeline: [] });
    }

    if (!canReadBridgeExperience({ viewerUserId: userId, participants: state.participants })) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    let sharedPins: Awaited<ReturnType<typeof listSharedGlobePinsForThread>> = [];
    const threadId = state.bridge.peerThreadId?.trim();
    if (
      threadId &&
      (await callerCanAccessPeerThread(supabase, threadId, userId))
    ) {
      try {
        sharedPins = await listSharedGlobePinsForThread(supabase, threadId);
      } catch {
        sharedPins = [];
      }
    }

    const host = state.participants.find((row) => row.role === "host");
    const contributions = await listBridgeContributions(supabase, key);
    const timeline = mergeBridgeTimeline({
      bridge: state.bridge,
      sharedPins,
      contributions,
      participants: state.participants.map((row) => ({
        userId: row.userId,
        displayName: row.displayName,
      })),
      viewerUserId: userId,
      hostDisplayName: host?.displayName,
    });

    return NextResponse.json({
      state: toBridgeStateWire(state),
      timeline: toBridgeTimelineWire(timeline),
      contributions: contributions.map(toBridgeContributionWire),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to load experience bridge.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type BridgePostBody = {
  action?: "bootstrap" | "invite";
  primaryEvent?: EventCandidate;
  peerThreadId?: string;
  hostDisplayName?: string;
  participantUserId?: string;
  participantDisplayName?: string;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const key = decodeURIComponent(eventId).trim();
  const body = (await request.json()) as BridgePostBody;
  const action = body.action ?? "invite";

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

    if (action === "bootstrap") {
      if (!isEventCandidate(body.primaryEvent) || body.primaryEvent.id !== key) {
        return NextResponse.json(
          { error: "primaryEvent with matching id required." },
          { status: 400 },
        );
      }

      const bridge = buildBridgeSnapshot({
        event: body.primaryEvent,
        hostUserId: userId,
        peerThreadId: body.peerThreadId,
      });
      const hostParticipant = buildHostParticipant({
        hostUserId: userId,
        displayName: body.hostDisplayName?.trim() || "나",
      });
      const state = await upsertExperienceBridge(supabase, {
        bridge,
        hostParticipant,
      });
      return NextResponse.json({ state });
    }

    const participantUserId = body.participantUserId?.trim();
    const participantDisplayName = body.participantDisplayName?.trim();
    if (!participantUserId || !participantDisplayName) {
      return NextResponse.json(
        { error: "participantUserId and participantDisplayName required." },
        { status: 400 },
      );
    }

    let state = await fetchExperienceBridgeState(supabase, key);
    if (!state) {
      if (!isEventCandidate(body.primaryEvent)) {
        return NextResponse.json(
          { error: "Bridge not found — bootstrap with primaryEvent first." },
          { status: 404 },
        );
      }
      const bridge = buildBridgeSnapshot({
        event: body.primaryEvent,
        hostUserId: userId,
        peerThreadId: body.peerThreadId,
      });
      state = createInitialBridgeState({
        bridge,
        hostDisplayName: body.hostDisplayName?.trim() || "나",
      });
      await upsertExperienceBridge(supabase, {
        bridge: state.bridge,
        hostParticipant: state.participants[0]!,
      });
    }

    if (state.bridge.hostUserId !== userId) {
      return NextResponse.json({ error: "Only host can invite." }, { status: 403 });
    }

    if (isEventCandidate(body.primaryEvent) && body.primaryEvent.id === key) {
      await updateBridgeEventSnapshot(supabase, body.primaryEvent);
      const refreshed = await fetchExperienceBridgeState(supabase, key);
      if (refreshed) {
        state = refreshed;
      }
    }

    const threadId = body.peerThreadId?.trim() || state.bridge.peerThreadId?.trim();
    if (
      threadId &&
      !(await callerCanAccessPeerThread(supabase, threadId, userId))
    ) {
      return NextResponse.json(
        { error: "Peer thread access denied." },
        { status: 403 },
      );
    }

    const next = inviteBridgeParticipant(state, {
      userId: participantUserId,
      displayName: participantDisplayName,
    });
    const invited = next.participants.find((row) => row.userId === participantUserId);
    if (invited) {
      await upsertBridgeParticipantRow(supabase, key, invited);
    }

    return NextResponse.json({ state: toBridgeStateWire(next) });
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to update experience bridge.");
    const status = message.includes("participant_cap") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
