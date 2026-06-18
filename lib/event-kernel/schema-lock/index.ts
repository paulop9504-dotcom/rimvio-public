export {
  EVENT_KERNEL_SCHEMA_LOCK_VERSION,
  type EventKernelSchemaLockVersion,
} from "@/lib/event-kernel/schema-lock/version";

export {
  LOCKED_EVENT_SCHEMA_VERSION,
  LOCKED_EVENT_CATEGORIES,
  LOCKED_EVENT_SOURCES,
  LOCKED_EVENT_LIFECYCLES,
  LOCKED_EVENT_CANONICAL_KEYS,
  LOCKED_EVENT_WIRE_KEYS,
  validateEventCandidateWire,
  assertValidEventCandidateWire,
  eventSchemaLockMeta,
  type LockedEventCategory,
  type LockedEventSource,
  type LockedEventLifecycle,
} from "@/lib/event-kernel/schema-lock/event-schema";

export {
  LOCKED_EXECUTION_EDGE_RELATIONS,
  LOCKED_CAUSAL_GRAPH_VERSION,
  LOCKED_CAUSAL_GRAPH_NODES,
  LOCKED_CAUSAL_TRACE_EDGES,
  LOCKED_TRACE_EDGE_LABELS,
  validateExecutionGraphEdges,
  assertValidExecutionGraphEdges,
  edgeSchemaLockMeta,
  type LockedExecutionEdgeRelation,
} from "@/lib/event-kernel/schema-lock/edge-schema";

export {
  LOCKED_KERNEL_OUTPUT_SCHEMA_VERSION,
  LOCKED_KERNEL_COMMIT_DECISIONS,
  LOCKED_KERNEL_OUTPUT_KEYS,
  validateEventKernelStrictOutput,
  assertValidEventKernelStrictOutput,
} from "@/lib/event-kernel/schema-lock/kernel-output-schema";

export {
  LOCKED_LIFECYCLE_ORDER,
  LOCKED_SSOT_WRITE_APIS,
  LOCKED_SSOT_WRITE_CALLER_PREFIXES,
  isAllowedLifecycleMutation,
  validateLifecycleMutation,
  assertAllowedLifecycleMutation,
  mutationRulesMeta,
} from "@/lib/event-kernel/schema-lock/mutation-rules";
