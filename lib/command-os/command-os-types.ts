import type { EventOSRuntimeProcessResult } from "@/lib/event-os/runtime/event-os-runtime-types";
import type { ReviewExecutionProcessResult } from "@/lib/event-os/review-execution-types";

export type EventIntent =
  | "CREATE_EVENT"
  | "OPEN_WINDOW"
  | "ACTION_QUERY"
  | "SEARCH"
  | "UNKNOWN";

export type ParsedCommand = {
  command: string;
  query: string;
  rawInput: string;
};

export type CommandExtractedContext = {
  time: string | null;
  subject: string | null;
  date: string | null;
};

/** Compiler AST — must exist before enqueue. */
export type CommandEventCandidate = {
  id: string;
  intent: EventIntent;
  rawInput: string;
  normalizedQuery: string;
  command: string;
  extractedContext: CommandExtractedContext;
  createdAt: string;
  intentResolvedVia: "rule" | "fallback";
};

export type CommandCompileResult = {
  candidate: CommandEventCandidate;
  runtime: ReviewExecutionProcessResult & {
    executionGraph?: EventOSRuntimeProcessResult["executionGraph"];
    runtime?: EventOSRuntimeProcessResult;
  };
};
