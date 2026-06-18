"use client";

import { canReadBridgeExperience } from "@/lib/experience-bridge/bridge-access";
import { fetchExperienceBridgeRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import {
  isBridgeLinkedEventId,
  stampBridgeEventMetadata,
} from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { createClient } from "@/lib/supabase/client";

export const BRIDGE_PUBLISH_LINK_REQUIRED =
  "브릿지에 연결된 맥락에서만 사진·동영상을 공유할 수 있어요.";

export const BRIDGE_PUBLISH_LOGIN_REQUIRED =
  "로그인 후에 사진·동영상을 공유할 수 있어요.";

export function resolveBridgePublishRole(input: {
  viewerUserId: string;
  hostUserId: string;
}): "host" | "participant" {
  const viewer = input.viewerUserId.trim();
  const host = input.hostUserId.trim();
  return viewer && viewer === host ? "host" : "participant";
}

/**
 * Host/invitee must have bridge stamp before upload — restore from server when
 * local metadata was cleared but membership still exists.
 */
export async function ensureBridgeLinkBeforePublish(eventId: string): Promise<boolean> {
  const key = eventId.trim();
  if (!key) {
    return false;
  }
  if (isBridgeLinkedEventId(key)) {
    return true;
  }

  try {
    const remote = await fetchExperienceBridgeRemote(key, { fresh: true });
    const state = remote.state;
    if (!state?.bridge.eventId?.trim()) {
      return false;
    }

    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const viewerId = data.session?.user?.id?.trim();
    if (!viewerId) {
      return false;
    }

    if (
      !canReadBridgeExperience({
        viewerUserId: viewerId,
        participants: state.participants,
      })
    ) {
      return false;
    }

    writeLocalBridgeState(state);

    const event = findLifeEventCandidate(key) ?? state.bridge.eventSnapshot;
    if (!event?.id?.trim()) {
      return false;
    }

    stampBridgeEventMetadata({
      event,
      bridge: state.bridge,
      role: resolveBridgePublishRole({
        viewerUserId: viewerId,
        hostUserId: state.bridge.hostUserId,
      }),
    });
    return isBridgeLinkedEventId(key);
  } catch {
    return false;
  }
}

export async function requireBridgeLinkBeforePublish(eventId: string): Promise<void> {
  if (await ensureBridgeLinkBeforePublish(eventId)) {
    return;
  }
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user?.id?.trim()) {
    throw new Error(BRIDGE_PUBLISH_LOGIN_REQUIRED);
  }
  throw new Error(BRIDGE_PUBLISH_LINK_REQUIRED);
}
