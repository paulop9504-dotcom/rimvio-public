/**
 * Execution Plane v1 — sole owner of HOW capabilities run.
 * @see docs/RIMVIO_EXECUTION_PLANE_V1_REPORT.md
 */
export {
  EXECUTION_CONTRACT_VERSION,
  type ExecutionStatus,
  type ExecutionPayload,
  type ExecutionResult,
  type ExecutionRecord,
  type EnqueueExecutionInput,
  type ExecutionDispatchResult,
} from "@/lib/execution/execution-contract";

export {
  enqueueExecution,
  cancelExecution,
  retryExecution,
  resumeExecution,
  markExecutionComplete,
  markExecutionFailed,
  resetExecutionDispatcherForTests,
} from "@/lib/execution/execution-dispatcher";

export {
  resetExecutionQueueForTests,
} from "@/lib/execution/execution-queue";

export {
  runExecutionJob,
  runExecutionQueue,
  getExecutionState,
} from "@/lib/execution/execution-engine";

export {
  appendExecutionHistory,
  listExecutionHistory,
  getExecutionFromHistory,
  summarizeExecutionHistory,
  resetExecutionHistoryForTests,
} from "@/lib/execution/execution-history";

export {
  canTransition,
  assertTransition,
  isTerminal,
} from "@/lib/execution/execution-lifecycle";

export {
  FIXTURE_NAVIGATE_JOB,
  FIXTURE_CALL_JOB,
  FIXTURE_ALARM_JOB,
} from "@/lib/execution/execution-test-fixtures";

export { submitCapabilityExecution } from "@/lib/execution/submit-capability-execution";
