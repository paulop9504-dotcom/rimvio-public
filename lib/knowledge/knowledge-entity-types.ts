export type KnowledgeContainerId = "calendar" | "data";

export type KnowledgeEntityType = "phone" | "text" | "contact" | "note" | "schedule" | "place";

export type KnowledgeEntity = {
  id: string;
  containerId: KnowledgeContainerId;
  type: KnowledgeEntityType;
  label: string;
  value: string;
  searchText: string;
  sourceMessage?: string;
  /** Link reference when filed from shared URL */
  sourceLinkId?: string;
  /** Topic container from Data Architect (e.g. news_briefing) */
  topicContainerId?: string;
  /** Action stream trigger — only set when promoted to schedule */
  scheduledAt?: string;
  createdAt: string;
};

export const FIXED_CALENDAR_CONTAINER_ID = "calendar" as const;
export const FIXED_DATA_CONTAINER_ID = "data" as const;
