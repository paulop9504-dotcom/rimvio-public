/** Soft cap for v1 shared experience participants (host + guests). */
export const EXPERIENCE_BRIDGE_MAX_PARTICIPANTS = 10;

export const EXPERIENCE_BRIDGE_META_KEYS = {
  bridgeId: "experienceBridgeId",
  hostUserId: "experienceBridgeHostUserId",
  peerThreadId: "experienceBridgePeerThreadId",
} as const;
