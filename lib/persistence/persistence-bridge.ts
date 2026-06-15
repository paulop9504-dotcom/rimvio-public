import { appendContainerEvent } from "@/lib/container-store/events-store";
import {
  appendContainerKnowledge,
  createContainer,
  getContainerById,
  listContainers,
} from "@/lib/container-store/containers-store";
import type { ContainerRecord } from "@/lib/container-store/types";
import { appendStreamRecords } from "@/lib/data-architect/persist-stream-record";
import type { CafeDiscoveryWire } from "@/lib/context-resolver/places/types";

export type PlaceKnowledgePayload = {
  name: string;
  address?: string | null;
  rating?: number;
  category?: string | null;
  thumbnail_url?: string | null;
  phone?: string | null;
  maps_url?: string | null;
  travel_minutes?: number;
  reason?: string;
  arrive_at?: string | null;
};

const PLACE_CONTAINER_TITLE = "장소·맛집";

export function placeWireOptionToPayload(
  option: CafeDiscoveryWire["options"][number]
): PlaceKnowledgePayload {
  const mapsAction = option.action_buttons.find((action) => /지도|map/i.test(action.label));
  const phoneAction = option.action_buttons.find((action) => /전화|tel/i.test(action.label));

  return {
    name: option.name,
    address: null,
    rating: option.rating > 0 ? option.rating : undefined,
    category: option.category,
    thumbnail_url: option.thumbnail_url,
    phone: phoneAction?.href?.replace(/^tel:/i, "") ?? null,
    maps_url: mapsAction?.href ?? null,
    travel_minutes: option.travel_minutes,
    reason: option.reason,
    arrive_at: option.arrive_at,
  };
}

export function resolvePlaceKnowledgeContainerId(): string {
  const existing = listContainers({ status: "active" }).find((item) => item.kind === "place");
  if (existing) {
    return existing.id;
  }

  const created = createContainer({
    id: "place",
    title: PLACE_CONTAINER_TITLE,
    goal: "맛집·카페·장소 추천 및 저장",
    topic: "place",
    kind: "place",
  });
  return created.id;
}

/** Persist ephemeral place card → container Knowledge (client-side). */
export function persistPlaceToKnowledge(
  placeData: PlaceKnowledgePayload,
  containerId?: string
): Promise<{ containerId: string; knowledgeId: string; container: ContainerRecord | null }> {
  const targetId = containerId?.trim() || resolvePlaceKnowledgeContainerId();
  const container = getContainerById(targetId);

  if (!container) {
    throw new Error(`Container not found: ${targetId}`);
  }

  const duplicate = container.knowledge.some(
    (item) => item.kind === "place" && item.label.trim() === placeData.name.trim()
  );
  if (duplicate) {
    const existing = container.knowledge.find(
      (item) => item.kind === "place" && item.label.trim() === placeData.name.trim()
    );
    return {
      containerId: targetId,
      knowledgeId: existing?.id ?? "",
      container: getContainerById(targetId),
    };
  }

  const saved = appendContainerKnowledge(targetId, [
    {
      label: placeData.name,
      value: placeData.address?.trim() || placeData.name,
      kind: "place",
      raw: {
        ...placeData,
        saved_at: new Date().toISOString(),
      },
    },
  ]);

  appendStreamRecords({
    container_id: targetId,
    container_title: saved?.title ?? PLACE_CONTAINER_TITLE,
    items: [`맛집 저장 · ${placeData.name}`],
  });

  appendContainerEvent({
    container_id: targetId,
    type: "knowledge_append",
    data: {
      kind: "place",
      name: placeData.name,
      source: "place_discovery_save",
    },
  });

  const knowledgeId =
    saved?.knowledge.find((item) => item.label === placeData.name)?.id ?? "";

  return {
    containerId: targetId,
    knowledgeId,
    container: saved,
  };
}
