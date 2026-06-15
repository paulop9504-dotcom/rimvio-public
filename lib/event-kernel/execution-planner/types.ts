import type { KernelExecutionAction } from "@/lib/event-kernel/intent-kernel-system/types";
import type {
  KernelFinalState,
  KernelRouteType,
} from "@/lib/event-kernel/intent-kernel-system/types";

/** §EXECUTION PLANNER — structural action only. */
export type ExecutionPlanAction = KernelExecutionAction;

export type ExecutionPlan = {
  action: ExecutionPlanAction;
  kernel_state: KernelFinalState;
  kernel_route: KernelRouteType;
  canonical_query?: string;
};
