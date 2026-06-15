export type DataArchitectAction = "APPEND" | "CREATE_NEW" | "UNCATEGORIZED";

export type ArchitectContainerKind = "canonical" | "context" | "place";

export type ArchitectContainerRef = {
  id: string;
  title: string;
  topic?: string;
  kind: ArchitectContainerKind;
};

export type DataArchitectClassification = {
  knowledge: string[];
  stream: string[];
};

export type DataArchitectWire = {
  container_id: string;
  container_title: string;
  action: DataArchitectAction;
  classification: DataArchitectClassification;
  reasoning: string;
  confidence?: number;
  stream_ids?: string[];
  knowledge_ids?: string[];
};

export type DataArchitectPersistResult = {
  wire: DataArchitectWire;
  container: ArchitectContainerRef;
};

export type DataArchitectInput = {
  rawInput: string;
  linkTitle?: string | null;
  linkUrl?: string | null;
};

export const UNCATEGORIZED_CONTAINER_ID = "uncategorized";
export const UNCATEGORIZED_CONTAINER_TITLE = "Uncategorized(임시)";
