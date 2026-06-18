/** First-class container row — goal-oriented bucket with embedded knowledge. */
import type { VitalityTag } from "@/lib/vitality/types";

export type ContainerStatus = "active" | "archived";

export type ContainerKnowledgeItem = {
  id: string;
  label: string;
  value: string;
  kind: "fact" | "link" | "note" | "place";
  created_at: string;
  raw?: Record<string, unknown> | null;
};

export type ContainerRecord = {
  id: string;
  goal: string;
  title: string;
  status: ContainerStatus;
  knowledge: ContainerKnowledgeItem[];
  topic?: string;
  kind: "canonical" | "context" | "place";
  vitality_tag: VitalityTag;
  created_at: string;
  updated_at: string;
  last_active_at: string;
};

export type ContainerEventType =
  | "user_message"
  | "orchestrator_result"
  | "link_capture"
  | "stream_append"
  | "knowledge_append"
  | "container_created";

export type ContainerEvent = {
  id: string;
  container_id: string | null;
  type: ContainerEventType;
  data: Record<string, unknown>;
  created_at: string;
};

export const ACTIVE_CONTAINER_WINDOW_MS = 24 * 60 * 60 * 1000;
