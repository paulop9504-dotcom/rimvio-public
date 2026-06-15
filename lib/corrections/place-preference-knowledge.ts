import type { CorrectionLogEntry } from "@/lib/action-chat/confirmation-types";
import { isEntityFacetMessage } from "@/lib/context-resolver/discovery/parse-entity-facet-intent";
import { extractPlaceIntentKey } from "@/lib/corrections/prior-place-choice";
import { listCorrectionLogs } from "@/lib/corrections/correction-log";
import {
  FIXED_DATA_CONTAINER_ID,
  type KnowledgeEntity,
} from "@/lib/knowledge/knowledge-entity-types";
import {
  getRecentKnowledgeEntities,
  saveKnowledgeEntity,
  searchKnowledgeEntities,
} from "@/lib/knowledge/knowledge-entity-db";

export type PlacePreferenceWire = {
  id: string;
  label: string;
  value: string;
  intent_key: string | null;
  address: string | null;
  source: "knowledge" | "correction";
};

function preferenceFromKnowledge(entity: KnowledgeEntity): PlacePreferenceWire {
  return {
    id: entity.id,
    label: entity.label,
    value: entity.value,
    intent_key: extractPlaceIntentKey({ message: entity.value, place_name: entity.label }),
    address: entity.value.includes("·") ? entity.value.split("·")[1]?.trim() ?? null : null,
    source: "knowledge",
  };
}

export function preferenceFromCorrection(entry: CorrectionLogEntry): PlacePreferenceWire | null {
  const place =
    entry.user_corrected_place_name?.trim() ||
    entry.ai_inferred_place_name?.trim() ||
    null;
  if (!place) {
    return null;
  }

  const address =
    entry.user_corrected_location?.trim() ||
    entry.ai_inferred_location?.trim() ||
    null;

  const intent = extractPlaceIntentKey({
    message: entry.user_input,
    place_name: place,
  });

  return {
    id: entry.id,
    label: intent ?? place,
    value: address ? `${place} · ${address}` : place,
    intent_key: intent,
    address,
    source: "correction",
  };
}

export async function savePlacePreferenceToKnowledge(
  entry: Omit<CorrectionLogEntry, "id" | "createdAt">
): Promise<KnowledgeEntity | null> {
  const place =
    entry.user_corrected_place_name?.trim() ||
    entry.ai_inferred_place_name?.trim() ||
    null;

  if (!place || entry.outcome === "rejected") {
    return null;
  }

  const address =
    entry.user_corrected_location?.trim() ||
    entry.ai_inferred_location?.trim() ||
    "";

  const intent =
    extractPlaceIntentKey({
      message: entry.user_input,
      place_name: place,
    }) ?? "단골 장소";

  return saveKnowledgeEntity({
    containerId: FIXED_DATA_CONTAINER_ID,
    type: "place",
    label: intent,
    value: address ? `${place} · ${address}` : place,
    sourceMessage: entry.user_input,
  });
}

/** Client → API: place prefs for server-side recall + prior choice. */
export async function buildPlacePreferencesWire(limit = 12): Promise<PlacePreferenceWire[]> {
  const knowledge = await getRecentKnowledgeEntities({
    containerId: FIXED_DATA_CONTAINER_ID,
    limit: 20,
  });
  const fromKnowledge = knowledge
    .filter((entity) => entity.type === "place")
    .map(preferenceFromKnowledge);

  const logs = await listCorrectionLogs(limit, { mergeRemote: true });
  const fromLogs = logs
    .map(preferenceFromCorrection)
    .filter((item): item is PlacePreferenceWire => item !== null);

  const seen = new Set<string>();
  const merged: PlacePreferenceWire[] = [];

  for (const item of [...fromKnowledge, ...fromLogs]) {
    const key = `${item.intent_key ?? item.label}|${item.value}`.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(item);
  }

  return merged.slice(0, limit);
}

export function recallPlacePreferencesFromWire(input: {
  message: string;
  preferences: PlacePreferenceWire[];
}): PlacePreferenceWire[] {
  const message = input.message.trim();
  if (!message || input.preferences.length === 0) {
    return [];
  }

  if (isEntityFacetMessage(message)) {
    return [];
  }

  const intentKey = extractPlaceIntentKey({ message });
  const placeRecall =
    /(?:단골|자주\s*가|전에|지난번|어디\s*갔|그\s*장소|장소\s*뭐|갔던)/u.test(message);

  if (!intentKey && !placeRecall) {
    return [];
  }

  if (!intentKey) {
    return input.preferences.slice(0, 2);
  }

  return input.preferences.filter((pref) => {
    const hay = `${pref.label} ${pref.value} ${pref.intent_key ?? ""}`.toLowerCase();
    return hay.includes(intentKey.toLowerCase());
  });
}

export async function searchPlaceKnowledgeEntities(query: string) {
  const hits = await searchKnowledgeEntities({
    query,
    containerId: FIXED_DATA_CONTAINER_ID,
    limit: 6,
  });
  return hits.filter((entity) => entity.type === "place");
}
