"use client";

import type { TransactionalFlushReport } from "@/lib/action-chat/confirmation-types";
import { cn } from "@/lib/utils";

type FlushResultStripProps = {
  report: TransactionalFlushReport;
  className?: string;
};

export function FlushResultStrip({ report, className }: FlushResultStripProps) {
  if (!report.failed.length && !report.succeeded.length) {
    return null;
  }

  const tone = report.failed.length
    ? report.hasPartialFailure
      ? "amber"
      : "rose"
    : "emerald";

  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return (
    <div className={cn("rounded-xl border px-3 py-2 text-[12px] leading-relaxed", toneClass, className)}>
      <p className="font-medium">{report.summary}</p>
      {report.failed.length > 0 ? (
        <ul className="mt-1 space-y-0.5 opacity-90">
          {report.failed.map((item) => (
            <li key={`${item.type}-${item.label}`}>
              · {item.label} — {item.error ?? "failed"}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
