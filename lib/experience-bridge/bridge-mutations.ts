import {
  EXPERIENCE_BRIDGE_MAX_PARTICIPANTS,
  EXPERIENCE_BRIDGE_META_KEYS,
} from "@/lib/experience-bridge/constants";
import {
  countActiveBridgeParticipants,
  isActiveBridgeParticipant,
} from "@/lib/experience-bridge/bridge-access";
import type {
  ExperienceBridgeParticipant,
  ExperienceBridgeParticipantStatus,
  ExperienceBridgeState,
} from "@/lib/experience-bridge/experience-bridge-types";
import type { ExperienceBridgeSnapshot } from "@/lib/experience-bridge/experience-bridge-types";

function nowIso(now?: Date): string {
  return (now ?? new Date()).toISOString();
}

export function buildHostParticipant(input: {
  hostUserId: string;
  displayName: string;
  now?: Date;
}): ExperienceBridgeParticipant {
  const at = nowIso(input.now);
  return {
    userId: input.hostUserId,
    displayName: input.displayName.trim() || "나",
    status: "accepted",
    role: "host",
    invitedAtIso: at,
    joinedAtIso: at,
  };
}

function countBridgeSlots(
  participants: readonly ExperienceBridgeParticipant[],
): number {
  return participants.filter(
    (row) =>
      row.status !== "declined" &&
      row.status !== "left" &&
      row.status !== "removed",
  ).length;
}

export function inviteBridgeParticipant(
  state: ExperienceBridgeState,
  input: {
    userId: string;
    displayName: string;
    now?: Date;
  },
): ExperienceBridgeState {
  const userId = input.userId.trim();
  const displayName = input.displayName.trim();
  if (!userId || !displayName) {
    throw new Error("invalid_invite");
  }

  if (userId === state.bridge.hostUserId) {
    throw new Error("cannot_invite_host");
  }

  const existing = state.participants.find((row) => row.userId === userId);
  if (existing && existing.status !== "declined" && existing.status !== "left") {
    return state;
  }

  if (countBridgeSlots(state.participants) >= EXPERIENCE_BRIDGE_MAX_PARTICIPANTS) {
    throw new Error("participant_cap");
  }

  const invitedAtIso = nowIso(input.now);
  const nextParticipant: ExperienceBridgeParticipant = {
    userId,
    displayName,
    status: "pending",
    role: "member",
    invitedAtIso,
  };

  const without = state.participants.filter((row) => row.userId !== userId);
  return {
    ...state,
    participants: [...without, nextParticipant],
  };
}

export function acceptBridgeInvite(
  state: ExperienceBridgeState,
  input: { userId: string; now?: Date },
): ExperienceBridgeState {
  const userId = input.userId.trim();
  const row = state.participants.find((p) => p.userId === userId);
  if (!row) {
    throw new Error("invite_not_found");
  }
  if (row.status !== "pending") {
    throw new Error("invite_not_pending");
  }

  const joinedAtIso = nowIso(input.now);
  return patchParticipant(state, userId, {
    status: "accepted",
    joinedAtIso,
    leftAtIso: null,
  });
}

export function declineBridgeInvite(
  state: ExperienceBridgeState,
  input: { userId: string; now?: Date },
): ExperienceBridgeState {
  const userId = input.userId.trim();
  const row = state.participants.find((p) => p.userId === userId);
  if (!row || row.status !== "pending") {
    throw new Error("invite_not_pending");
  }
  return patchParticipant(state, userId, {
    status: "declined",
    leftAtIso: nowIso(input.now),
  });
}

export function leaveBridgeExperience(
  state: ExperienceBridgeState,
  input: { userId: string; now?: Date },
): ExperienceBridgeState {
  const userId = input.userId.trim();
  const row = state.participants.find((p) => p.userId === userId);
  if (!row || row.role === "host") {
    throw new Error("host_cannot_leave");
  }
  if (!isActiveBridgeParticipant(row) && row.status !== "pending") {
    return state;
  }
  return patchParticipant(state, userId, {
    status: "left",
    leftAtIso: nowIso(input.now),
  });
}

export function removeBridgeParticipant(
  state: ExperienceBridgeState,
  input: {
    hostUserId: string;
    targetUserId: string;
    now?: Date;
  },
): ExperienceBridgeState {
  if (input.hostUserId !== state.bridge.hostUserId) {
    throw new Error("forbidden");
  }
  const targetUserId = input.targetUserId.trim();
  const row = state.participants.find((p) => p.userId === targetUserId);
  if (!row || row.role === "host") {
    throw new Error("invalid_target");
  }
  return patchParticipant(state, targetUserId, {
    status: "removed",
    leftAtIso: nowIso(input.now),
  });
}

function patchParticipant(
  state: ExperienceBridgeState,
  userId: string,
  patch: Partial<ExperienceBridgeParticipant> & {
    status: ExperienceBridgeParticipantStatus;
  },
): ExperienceBridgeState {
  return {
    ...state,
    participants: state.participants.map((row) =>
      row.userId === userId ? { ...row, ...patch } : row,
    ),
  };
}

export function createInitialBridgeState(input: {
  bridge: ExperienceBridgeSnapshot;
  hostDisplayName: string;
}): ExperienceBridgeState {
  return {
    bridge: input.bridge,
    participants: [
      buildHostParticipant({
        hostUserId: input.bridge.hostUserId,
        displayName: input.hostDisplayName,
      }),
    ],
  };
}

export function listReadableBridgeParticipants(
  participants: readonly ExperienceBridgeParticipant[],
): ExperienceBridgeParticipant[] {
  return participants.filter(isActiveBridgeParticipant);
}
