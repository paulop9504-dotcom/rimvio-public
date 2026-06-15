import { touchContainer, createContainer, getContainerById } from "@/lib/container-store/containers-store";
import { appendContainerEvent } from "@/lib/container-store/events-store";
import { queueInboxFromWire } from "@/lib/home/inbox-store";
import { upsertContextContainer } from "@/lib/containers/context-containers";
import { FIXED_DATA_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import { saveKnowledgeEntity } from "@/lib/knowledge/knowledge-entity-db";
import { architectActionLabel } from "@/lib/data-architect/ingest-decision-options";
import {
  findContainerByIdOrTitle,
  upsertArchitectContextMemory,
} from "@/lib/data-architect/list-existing-containers";
import { appendStreamRecords } from "@/lib/data-architect/persist-stream-record";
import type {
  ArchitectContainerRef,
  DataArchitectPersistResult,
  DataArchitectWire,
} from "@/lib/data-architect/types";
import {
  UNCATEGORIZED_CONTAINER_ID,
  UNCATEGORIZED_CONTAINER_TITLE,
} from "@/lib/data-architect/types";

function resolveTargetContainer(wire: DataArchitectWire): ArchitectContainerRef {
  if (wire.action === "UNCATEGORIZED") {
    return {
      id: UNCATEGORIZED_CONTAINER_ID,
      title: UNCATEGORIZED_CONTAINER_TITLE,
      topic: "uncategorized",
      kind: "context",
    };
  }

  const existing = findContainerByIdOrTitle(wire.container_id);
  if (existing) return existing;

  if (wire.action === "CREATE_NEW") {
    if (typeof window === "undefined") {
      return upsertArchitectContextMemory({
        id: wire.container_id.startsWith("ctx-") ? wire.container_id : undefined,
        title: wire.container_title,
        topic: inferTopicFromTitle(wire.container_title),
      });
    }
    const created = upsertContextContainer({
      id: wire.container_id.startsWith("ctx-") ? wire.container_id : undefined,
      title: wire.container_title,
      topic: inferTopicFromTitle(wire.container_title),
    });
    return { id: created.id, title: created.title, topic: created.topic, kind: "context" };
  }

  return { id: wire.container_id, title: wire.container_title, topic: "general", kind: "context" };
}

function inferTopicFromTitle(title: string): string | undefined {
  if (/(?:일정|미팅|회의)/u.test(title)) return "schedule";
  if (/(?:뉴스|기사)/u.test(title)) return "news";
  if (/(?:장소|맛집|카페)/u.test(title)) return "place";
  return undefined;
}

function knowledgeTypeForValue(value: string): "text" | "phone" | "note" | "place" {
  if (/^전화:/u.test(value) || /^\d{2,3}-?\d{3,4}-?\d{4}$/.test(value)) return "phone";
  if (/^주소:/u.test(value)) return "text";
  if (/^https?:\/\//i.test(value)) return "text";
  return "note";
}

async function persistKnowledgeItems(input: {
  items: string[];
  labelPrefix: string;
  sourceText: string;
  containerTag: string;
}): Promise<string[]> {
  const ids: string[] = [];
  for (const [index, value] of input.items.entries()) {
    const entity = await saveKnowledgeEntity({
      containerId: FIXED_DATA_CONTAINER_ID,
      type: knowledgeTypeForValue(value),
      label: `${input.labelPrefix} ${index + 1}`,
      value,
      sourceMessage: `[${input.containerTag}] ${input.sourceText.slice(0, 400)}`,
    });
    ids.push(entity.id);
  }
  return ids;
}

export async function executeIngestDecision(input: {
  wire: DataArchitectWire;
  sourceText: string;
}): Promise<DataArchitectPersistResult> {
  const wire = input.wire;
  const container = resolveTargetContainer(wire);

  if (wire.action === "UNCATEGORIZED") {
    queueInboxFromWire({
      wire,
      preview: input.sourceText.slice(0, 280),
    });
    return { wire, container };
  }

  const knowledge_ids = await persistKnowledgeItems({
    items: wire.classification.knowledge,
    labelPrefix: `[${container.title}] Knowledge`,
    sourceText: input.sourceText,
    containerTag: `container:${container.id}`,
  });

  let stream_ids: string[] = [];
  if (wire.classification.stream.length > 0) {
    stream_ids = appendStreamRecords({
      container_id: container.id,
      container_title: container.title,
      items: wire.classification.stream,
    }).map((record) => record.id);
  }

  if (container.kind === "context") {
    upsertContextContainer({ id: container.id, title: container.title, topic: container.topic });
  }

  if (!getContainerById(container.id)) {
    createContainer({
      id: container.id,
      title: container.title,
      goal: wire.reasoning,
      topic: container.topic,
      kind: container.kind === "place" ? "place" : container.kind === "canonical" ? "canonical" : "context",
    });
  }
  touchContainer(container.id);
  appendContainerEvent({
    container_id: container.id,
    type: "knowledge_append",
    data: {
      knowledge_count: wire.classification.knowledge.length,
      stream_count: wire.classification.stream.length,
      action: wire.action,
    },
  });

  return {
    wire: { ...wire, container_id: container.id, container_title: container.title, knowledge_ids, stream_ids },
    container,
  };
}

export const persistArchitectAssignment = executeIngestDecision;

export function formatArchitectSummary(wire: DataArchitectWire): string {
  const k = wire.classification.knowledge.length;
  const s = wire.classification.stream.length;
  const lines = [
    `📦 **${wire.container_title}** · ${architectActionLabel(wire.action)}`,
    wire.reasoning,
    "",
  ];

  if (wire.action === "UNCATEGORIZED") {
    lines.push("어느 컨테이너에 넣을지 확인해 주세요.");
    if (k > 0 || s > 0) {
      lines.push(`추출: Knowledge ${k}건 · Stream ${s}건`);
    }
    return lines.join("\n");
  }

  lines.push(k > 0 ? `Knowledge ${k}건 · Stream ${s}건 정리했어요.` : s > 0 ? `Stream ${s}건 정리했어요.` : "데이터를 정리했어요.");
  if (wire.action === "CREATE_NEW") lines.push("", "새 컨테이너를 만들고 데이터를 넣었어요.");
  return lines.join("\n");
}
