import type { LinkActionItem } from "@/types/database";

export type ActionAgentTaskType =
  | "ADDRESS"
  | "PHONE"
  | "DATETIME"
  | "PLACE"
  | "URL"
  | "SCHEDULE"
  | "DEEP_LINK";

export type ActionAgentExtractedData = {
  address: string | null;
  phone: string | null;
  datetime: string | null;
  place_name: string | null;
  url: string | null;
  schedule_note: string | null;
};

export type ActionAgentActionWire = {
  label: string;
  url: string;
  icon?: string;
};

export type ActionAgentTaskResult = {
  type: ActionAgentTaskType;
  extracted_data: ActionAgentExtractedData;
  actions: ActionAgentActionWire[];
};

export type ActionAgentBatchWire = {
  results: ActionAgentTaskResult[];
};

export type ActionAgentBatchItem = {
  type: ActionAgentTaskType;
  extracted_data: ActionAgentExtractedData;
  actions: LinkActionItem[];
  summary: string;
};
