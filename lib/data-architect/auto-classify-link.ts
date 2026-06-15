import { queueInboxFromWire } from "@/lib/home/inbox-store";
import { withArchitectConfidence } from "@/lib/data-architect/confidence";
import { buildLinkRawInput } from "@/lib/data-architect/build-link-input";
import { executeIngestDecision } from "@/lib/data-architect/persist-architect-assignment";
import { ruleClassifyInput } from "@/lib/data-architect/rule-classify-input";
import type { DataArchitectWire } from "@/lib/data-architect/types";
import {
  getRecentKnowledgeEntities,
  saveKnowledgeEntity,
} from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_DATA_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";
import type { LinkRow } from "@/types/database";

export type AutoFileLinkResult = {
  entity: KnowledgeEntity;
  wire: DataArchitectWire;
  filed: boolean;
};

export function classifyLink(link: LinkRow): DataArchitectWire {
  return withArchitectConfidence(ruleClassifyInput(buildLinkRawInput(link)), buildLinkRawInput(link));
}

export async function findLinkPoolEntity(linkId: string): Promise<KnowledgeEntity | null> {
  const existing = await getRecentKnowledgeEntities({
    containerId: FIXED_DATA_CONTAINER_ID,
    limit: 200,
  });
  return existing.find((entity) => entity.sourceLinkId === linkId && !entity.scheduledAt) ?? null;
}

/** Capture ingress — classify + file link into topic container automatically. */
export async function autoFileLink(link: LinkRow): Promise<AutoFileLinkResult> {
  const wire = classifyLink(link);
  const prior = await findLinkPoolEntity(link.id);

  if (prior?.topicContainerId) {
    return { entity: prior, wire, filed: true };
  }

  let filed = false;
  let topicContainerId: string | undefined;
  let topicTitle = wire.container_title;

  if (wire.action !== "UNCATEGORIZED") {
    const persisted = await executeIngestDecision({
      wire,
      sourceText: buildLinkRawInput(link),
    });
    topicContainerId = persisted.container.id;
    topicTitle = persisted.container.title;
    filed = true;
  } else {
    queueInboxFromWire({
      wire,
      preview: link.title?.trim() || link.original_url,
      linkId: link.id,
      linkTitle: link.title,
    });
  }

  const entity = await saveKnowledgeEntity({
    id: prior?.id,
    containerId: FIXED_DATA_CONTAINER_ID,
    type: "note",
    label: link.title?.trim() || "저장한 링크",
    value: link.original_url,
    sourceLinkId: link.id,
    sourceMessage: topicContainerId
      ? `[topic:${topicContainerId}] ${topicTitle}`
      : link.domain,
    topicContainerId,
  });

  return { entity, wire, filed };
}

export async function autoFileLinksIfNeeded(links: LinkRow[]): Promise<AutoFileLinkResult[]> {
  const results: AutoFileLinkResult[] = [];
  for (const link of links) {
    const prior = await findLinkPoolEntity(link.id);
    if (prior?.topicContainerId) {
      continue;
    }
    results.push(await autoFileLink(link));
  }
  return results;
}
