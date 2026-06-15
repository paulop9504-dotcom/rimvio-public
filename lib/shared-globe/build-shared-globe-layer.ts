import type { SharedGlobe, SharedGlobeLayer } from "@/lib/shared-globe/shared-globe-types";

export function buildSharedGlobeLayer(globe: SharedGlobe): SharedGlobeLayer {
  const recallLine = globe.isEmpty
    ? `${globe.title} · 빈 지구에 핀을 같이 박아요`
    : `${globe.title} · 핀 ${globe.pins.length} · ${globe.members.length}명`;

  return {
    layerId: "shared_graph",
    globeId: globe.id,
    experienceRoomId: globe.experienceRoomId,
    title: globe.title,
    memberCount: globe.members.length,
    pinCount: globe.pins.length,
    isEmpty: globe.isEmpty,
    recallLine,
  };
}
