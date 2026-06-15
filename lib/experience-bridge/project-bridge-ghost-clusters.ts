import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";

/** Pending bridge invites → semi-transparent ghost pins on home globe. */
export function projectBridgeGhostClusters(
  invites: readonly PendingBridgeInvite[],
): PinCluster[] {
  return invites.map(({ state }) => {
    const { bridge } = state;
    const host = state.participants.find((row) => row.role === "host");
    const hostName = host?.displayName?.trim() || "친구";
    return {
      pinId: `bridge-ghost:${bridge.eventId}`,
      eventId: bridge.eventId,
      title: bridge.title,
      placeLabel: bridge.placeLabel,
      lat: bridge.lat,
      lng: bridge.lng,
      dateLabel: null,
      startedAtIso: bridge.createdAtIso,
      evidence: {
        photoCount: 0,
        videoCount: 0,
        chatCount: 0,
        placePinCount: 1,
      },
      recallLine: `${hostName}님이 경험을 공유했어요`,
      variant: "bridge_ghost",
      bridgeHostName: hostName,
    };
  });
}
