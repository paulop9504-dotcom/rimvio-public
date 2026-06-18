import { attachKernelSnapshot } from "@/lib/intent/kernel-snapshot";
import { readSaveTrajectory } from "@/lib/intent/save-trajectory-client";
import type { KernelSnapshotAttach } from "@/lib/intent/kernel-snapshot";
import type { LinkRow } from "@/types/database";

export type UserActionEventKind =
  | "impression"
  | "click"
  | "skip"
  | "dismiss"
  | "defer"
  | "yield";

export type ReceiptDisposition = "defer" | "yield";

export type InferredEmotionPlaceholder = {
  emotion: null;
  model: null;
  at: null;
};

export type UserActionMetadata = {
  chip_id?: string | null;
  local_time?: string;
  local_hour?: number;
  dwell_time_ms?: number | null;
  time_to_action_ms?: number | null;
  receipt_visible?: boolean;
  disposition?: ReceiptDisposition | null;
  is_undone?: boolean;
  undone_within_ms?: number | null;
  inferred: InferredEmotionPlaceholder;
  kernel_snapshot: KernelSnapshotAttach;
};

export const EMPTY_INFERRED: InferredEmotionPlaceholder = {
  emotion: null,
  model: null,
  at: null,
};

function formatLocalTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function buildUserActionMetadata(
  link: Pick<LinkRow, "category" | "domain" | "title" | "source_type"> | null,
  partial: Partial<Omit<UserActionMetadata, "inferred" | "kernel_snapshot">> = {},
  now = Date.now()
): UserActionMetadata {
  const date = new Date(now);
  const saveHistory = readSaveTrajectory();

  return {
    chip_id: partial.chip_id ?? null,
    local_time: partial.local_time ?? formatLocalTime(date),
    local_hour: partial.local_hour ?? date.getHours(),
    dwell_time_ms: partial.dwell_time_ms ?? null,
    time_to_action_ms: partial.time_to_action_ms ?? null,
    receipt_visible: partial.receipt_visible ?? false,
    disposition: partial.disposition ?? null,
    is_undone: partial.is_undone ?? false,
    undone_within_ms: partial.undone_within_ms ?? null,
    inferred: EMPTY_INFERRED,
    kernel_snapshot: attachKernelSnapshot({
      saveHistory,
      link,
      now,
    }),
  };
}
