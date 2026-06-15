import { appendContainerEvent } from "@/lib/container-store/events-store";
import {
  appendContainerKnowledge,
  touchContainer,
} from "@/lib/container-store/containers-store";
import { formatContainerContextBlock } from "@/lib/container-store/resolve-container-context";
import {
  findRelevantContainerAsync,
  isContainerWorthCreating,
} from "@/lib/container-store/find-relevant-container";
import type { ContainerRecord } from "@/lib/container-store/types";
import { appendStreamRecords } from "@/lib/data-architect/persist-stream-record";
import { extractKnowledgeAndStream } from "@/lib/data-architect/rule-classify-input";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

export type ContainerRouteResult = {
  container: ContainerRecord | null;
  contextBlock: string | null;
};

export async function routeOrchestratorContainer(input: {
  message: string;
  linkTitle?: string | null;
  linkUrl?: string | null;
}): Promise<ContainerRouteResult> {
  const message = input.message.trim();
  if (!message) {
    return { container: null, contextBlock: null };
  }

  appendContainerEvent({
    container_id: null,
    type: "user_message",
    data: { message, linkTitle: input.linkTitle ?? null, linkUrl: input.linkUrl ?? null },
  });

  const container = await findRelevantContainerAsync({
    rawInput: message,
    linkTitle: input.linkTitle,
    linkUrl: input.linkUrl,
  });

  if (container) {
    appendContainerEvent({
      container_id: container.id,
      type: "stream_append",
      data: { phase: "route_match", message: message.slice(0, 500) },
    });
  } else if (isContainerWorthCreating(message)) {
    appendContainerEvent({
      container_id: null,
      type: "container_created",
      data: { skipped: true, reason: "worth_creating_but_unmatched", message: message.slice(0, 200) },
    });
  }

  return {
    container,
    contextBlock: formatContainerContextBlock(container),
  };
}

export async function persistOrchestratorToContainer(input: {
  container: ContainerRecord | null;
  message: string;
  result: OrchestratorResult;
}): Promise<void> {
  if (!input.container) {
    appendContainerEvent({
      container_id: null,
      type: "orchestrator_result",
      data: { summary: input.result.summary, source: input.result.source },
    });
    return;
  }

  const split = extractKnowledgeAndStream(input.message);
  const summaryStream = input.result.summary?.trim();

  if (split.knowledge.length) {
    appendContainerKnowledge(
      input.container.id,
      split.knowledge.map((value) => ({
        label: "Knowledge",
        value,
        kind: value.startsWith("http") ? "link" : "fact",
      }))
    );
  }

  const streamItems = [...split.stream];
  if (summaryStream) {
    streamItems.unshift(summaryStream.slice(0, 500));
  }

  if (streamItems.length) {
    appendStreamRecords({
      container_id: input.container.id,
      container_title: input.container.title,
      items: streamItems,
    });
  }

  touchContainer(input.container.id);

  appendContainerEvent({
    container_id: input.container.id,
    type: "orchestrator_result",
    data: {
      summary: input.result.summary,
      source: input.result.source,
      action_count: input.result.actions.length,
    },
  });
}
