import { listEventsForContainer } from "@/lib/container-store/events-store";
import { listStreamRecordsForContainer } from "@/lib/data-architect/persist-stream-record";
import type { ContainerRecord } from "@/lib/container-store/types";

export function formatContainerContextBlock(container: ContainerRecord | null): string | null {
  if (!container) {
    return null;
  }

  const knowledgeLines = container.knowledge
    .slice(0, 8)
    .map((item, index) => `${index + 1}. [${item.kind}] ${item.label}: ${item.value}`);

  const streamLines = listStreamRecordsForContainer(container.id, 5).map(
    (record, index) => `${index + 1}. ${record.text}`
  );

  const eventLines = listEventsForContainer(container.id, 5).map(
    (event) => `- ${event.type}: ${JSON.stringify(event.data).slice(0, 120)}`
  );

  return [
    "# [CONTAINER CONTEXT]",
    `container_id: ${container.id}`,
    `title: ${container.title}`,
    `goal: ${container.goal}`,
    "",
    knowledgeLines.length ? "# Knowledge\n" + knowledgeLines.join("\n") : "# Knowledge\n(empty)",
    "",
    streamLines.length ? "# Stream\n" + streamLines.join("\n") : "# Stream\n(empty)",
    "",
    eventLines.length ? "# Recent Events\n" + eventLines.join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");
}
