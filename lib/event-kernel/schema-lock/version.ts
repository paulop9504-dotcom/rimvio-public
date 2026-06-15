/** Bump only with an explicit migration plan — OS contracts depend on this. */
export const EVENT_KERNEL_SCHEMA_LOCK_VERSION = "1.0.0" as const;

export type EventKernelSchemaLockVersion = typeof EVENT_KERNEL_SCHEMA_LOCK_VERSION;
