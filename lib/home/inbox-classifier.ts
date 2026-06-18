import { appendContainerEvent } from "@/lib/container-store/events-store";
import {
  appendContainerKnowledge,
  createContainer,
  listContainers,
  touchContainer,
} from "@/lib/container-store/containers-store";
import type { ContainerRecord } from "@/lib/container-store/types";
import { extractKnowledgeAndStream } from "@/lib/data-architect/rule-classify-input";
import { appendStreamRecords } from "@/lib/data-architect/persist-stream-record";
import {
  getInboxItemById,
  resolveInboxItem,
} from "@/lib/home/inbox-store";
import {
  DEFAULT_VITALITY_TAG,
  VITALITY_PRESETS,
  type VitalityTag,
} from "@/lib/vitality/types";

export function resolveVitalityContainer(tag: VitalityTag): ContainerRecord {
  const existing = listContainers({ status: "active" }).find(
    (item) => item.vitality_tag === tag && item.kind === "context"
  );
  if (existing) {
    return existing;
  }

  const preset = VITALITY_PRESETS[tag];
  return createContainer({
    title: preset.title,
    goal: preset.goal,
    topic: tag.toLowerCase(),
    kind: "context",
    vitality_tag: tag,
  });
}

/** User feedback loop — INBOX item → Vitality container → Knowledge / Stream. */
export function classifyInboxItemWithVitality(input: {
  inboxItemId: string;
  vitalityTag?: VitalityTag;
}): { containerId: string; containerTitle: string } {
  const item = getInboxItemById(input.inboxItemId);
  if (!item || item.resolved_at) {
    throw new Error("INBOX item not found or already resolved");
  }

  const tag = input.vitalityTag ?? DEFAULT_VITALITY_TAG;
  const container = resolveVitalityContainer(tag);
  const split = extractKnowledgeAndStream(item.preview);

  if (split.knowledge.length) {
    appendContainerKnowledge(
      container.id,
      split.knowledge.map((value) => ({
        label: "Knowledge",
        value,
        kind: value.startsWith("http") ? "link" : "fact",
      }))
    );
  }

  const streamItems = [...split.stream];
  if (streamItems.length === 0) {
    streamItems.push(item.preview.slice(0, 500));
  }

  appendStreamRecords({
    container_id: container.id,
    container_title: container.title,
    items: streamItems,
  });

  touchContainer(container.id);

  appendContainerEvent({
    container_id: container.id,
    type: "knowledge_append",
    data: {
      source: "inbox_vitality_classifier",
      vitality_tag: tag,
      inbox_item_id: item.id,
      preview: item.preview.slice(0, 200),
    },
  });

  resolveInboxItem(item.id);

  return {
    containerId: container.id,
    containerTitle: container.title,
  };
}
