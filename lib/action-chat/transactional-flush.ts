import type {
  BatchPendingItem,
  FlushItemResult,
  TransactionalFlushReport,
} from "@/lib/action-chat/confirmation-types";
import {
  FIXED_CALENDAR_CONTAINER_ID,
  FIXED_DATA_CONTAINER_ID,
} from "@/lib/knowledge/knowledge-entity-types";
import { sanitizePlaceNameForNavigation } from "@/lib/action-chat/resolve-navigation-place";
import { saveKnowledgeEntity } from "@/lib/knowledge/knowledge-entity-db";

export type FlushExecutor = (
  item: BatchPendingItem,
  index: number
) => Promise<void>;

function labelForItem(item: BatchPendingItem) {
  return item.summary ?? item.type;
}

function missingFields(item: BatchPendingItem): string[] {
  const data = item.extracted_data ?? {};
  const missing: string[] = [];

  if (item.type === "PHONE" && !data.phone) {
    missing.push("phone");
  }
  if (item.type === "DATETIME" && !data.datetime) {
    missing.push("datetime");
  }
  if (item.type === "ADDRESS" && !data.address && !data.place_name) {
    missing.push("address");
  }
  if (item.type === "URL" && !data.url) {
    missing.push("url");
  }

  return missing;
}

async function defaultFlushExecutor(item: BatchPendingItem) {
  const data = item.extracted_data ?? {};

  switch (item.type) {
    case "PHONE":
      if (!data.phone) {
        throw new Error("missing_phone");
      }
      await saveKnowledgeEntity({
        containerId: FIXED_DATA_CONTAINER_ID,
        type: "phone",
        label: "연락처",
        value: data.phone.replace(/\D/g, ""),
        sourceMessage: item.summary ?? data.phone,
      });
      return;

    case "DATETIME":
    case "SCHEDULE":
      if (!data.datetime) {
        throw new Error("missing_datetime");
      }
      await saveKnowledgeEntity({
        containerId: FIXED_CALENDAR_CONTAINER_ID,
        type: "schedule",
        label:
          data.schedule_note ??
          sanitizePlaceNameForNavigation(data.place_name, data.place_name) ??
          "일정",
        value: data.datetime,
        sourceMessage: item.summary ?? data.datetime,
      });
      return;

    case "URL":
      if (!data.url) {
        throw new Error("missing_url");
      }
      await saveKnowledgeEntity({
        containerId: FIXED_DATA_CONTAINER_ID,
        type: "note",
        label: "링크",
        value: data.url,
        sourceMessage: item.summary ?? data.url,
      });
      return;

    default:
      return;
  }
}

function buildFlushSummary(succeeded: FlushItemResult[], failed: FlushItemResult[]) {
  if (failed.length === 0) {
    if (succeeded.length === 0) {
      return "";
    }
    const allSchedule = succeeded.every(
      (item) => item.type === "DATETIME" || item.type === "SCHEDULE"
    );
    if (allSchedule && succeeded.length >= 2) {
      return `총 ${succeeded.length}개의 일정이 모두 등록되었습니다.`;
    }
    if (allSchedule && succeeded.length === 1) {
      return "일정을 등록했어요.";
    }
    return `모든 후속 작업 ${succeeded.length}건을 처리했어요.`;
  }

  if (succeeded.length === 0) {
    const first = failed[0]?.label ?? "작업";
    return `${first} 처리에 실패했어요. 다시 시도할까요?`;
  }

  const ok = succeeded.map((item) => item.label).join(", ");
  const bad = failed.map((item) => item.label).join(", ");
  return `${ok}은(는) 완료했지만, ${bad}은(는) 실패했어요. 다시 시도할까요?`;
}

export async function flushBatchPendingTransactionally(
  pending: BatchPendingItem[] | undefined,
  options?: {
    executor?: FlushExecutor;
    simulateTimeoutOnIndex?: number;
    timeoutMs?: number;
  }
): Promise<TransactionalFlushReport> {
  if (!pending?.length) {
    return {
      succeeded: [],
      failed: [],
      summary: "",
      hasPartialFailure: false,
    };
  }

  const executor = options?.executor ?? defaultFlushExecutor;
  const succeeded: FlushItemResult[] = [];
  const failed: FlushItemResult[] = [];

  for (let index = 0; index < pending.length; index += 1) {
    const item = pending[index]!;
    const label = labelForItem(item);
    const missing = missingFields(item);

    if (missing.length > 0) {
      failed.push({
        type: item.type,
        label,
        status: "failed",
        error: `missing_${missing.join("_")}`,
      });
      continue;
    }

    if (options?.simulateTimeoutOnIndex === index) {
      failed.push({
        type: item.type,
        label,
        status: "failed",
        error: "timeout",
      });
      continue;
    }

    try {
      await executor(item, index);
      succeeded.push({ type: item.type, label, status: "success" });
    } catch (error) {
      failed.push({
        type: item.type,
        label,
        status: "failed",
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  return {
    succeeded,
    failed,
    summary: buildFlushSummary(succeeded, failed),
    hasPartialFailure: failed.length > 0 && succeeded.length > 0,
  };
}
