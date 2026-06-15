import { findPlaceContainerByQuery } from "@/lib/data-ingestion/persist-place-container";
import { getRecentKnowledgeEntities } from "@/lib/knowledge/knowledge-entity-db";
import { readBehaviorProfile } from "@/lib/notification-shadow/behavior-learner";
import { listShadowRecords } from "@/lib/notification-shadow/shadow-store";
import type { PlacePreferenceContext, PlaceVibe } from "@/lib/context-resolver/places/types";

export async function resolvePlacePreference(input?: {
  vibe?: PlaceVibe;
}): Promise<PlacePreferenceContext> {
  const profile = readBehaviorProfile();
  const quietAffinity = Math.min(
    20,
    (profile.categoryEngagement?.PERSONAL ?? 0) + (profile.containerAffinity?.news_briefing ?? 0)
  );

  const entities = await getRecentKnowledgeEntities({ limit: 20 });
  const visited = entities
    .filter((entity) => entity.type === "place" || /카페|cafe|coffee/i.test(entity.label))
    .map((entity) => entity.label)
    .slice(0, 5);

  const shadowCafe = listShadowRecords()
    .filter((record) => /카페|cafe|coffee|맛집/i.test(`${record.summary} ${record.source_app}`))
    .sort((a, b) => b.priority_score - a.priority_score)[0];

  let shadowHint: string | null = null;
  if (visited[0]) {
    const similar = await findPlaceContainerByQuery(visited[0]!);
    if (similar?.schema.name) {
      shadowHint = `지난번 가셨던 ${similar.schema.name}와 비슷한 분위기`;
    } else {
      shadowHint = `지난번 가셨던 ${visited[0]}와 비슷한 분위기`;
    }
  } else if (shadowCafe) {
    shadowHint = `최근 관심 있던 ${shadowCafe.summary}`;
  }

  const vibeBoost =
    input?.vibe === "quiet"
      ? Math.min(20, quietAffinity + (visited.length > 0 ? 4 : 0))
      : quietAffinity;

  return {
    quiet_affinity: vibeBoost,
    visited_places: visited,
    shadow_hint: shadowHint,
  };
}
