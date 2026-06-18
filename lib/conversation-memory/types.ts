export type ConversationMemoryRecord = {
  id: string;
  topic: string;
  summary: string;
  keywords: string[];
  createdAt: string;
  messageCount: number;
};

export type ConversationMemoryWire = Pick<
  ConversationMemoryRecord,
  "id" | "topic" | "summary" | "keywords" | "createdAt"
>;
