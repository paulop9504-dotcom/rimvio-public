import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  HardcoreBatchSummary,
  HardcoreExecutionEntry,
} from "@/lib/testing/hardcore-red-team/types";

const DEFAULT_LOG = join(process.cwd(), ".cursor", "hardcore-red-team.log.jsonl");

export function appendHardcoreExecutionLog(
  entry: HardcoreExecutionEntry,
  logPath = DEFAULT_LOG
): void {
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
}

export function appendHardcoreBatchSummary(
  summary: HardcoreBatchSummary,
  logPath = DEFAULT_LOG
): void {
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(
    logPath,
    `${JSON.stringify({ type: "batch_summary", ...summary, timestamp: new Date().toISOString() })}\n`,
    "utf8"
  );
}

export function getHardcoreLogPath(): string {
  return process.env.RIMVIO_HARDCORE_LOG ?? DEFAULT_LOG;
}
