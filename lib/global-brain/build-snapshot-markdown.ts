import type { GlobalBrainSnapshot } from "@/lib/global-brain/types";

function isApexLikeTask(task: string): boolean {
  return /(?:미팅|meeting|회의|발표|업무|프로젝트|데드라인|작업|코딩)/iu.test(task);
}

/** Human-readable snapshot block — injected above JSON for LLM grounding. */
export function buildCurrentSnapshotMarkdown(snapshot: GlobalBrainSnapshot): string {
  const apexRemaining = snapshot.remainingSchedule.filter((item) =>
    isApexLikeTask(item.task)
  ).length;

  const topConflict = snapshot.eventHorizon[0];
  const conflictLine = topConflict
    ? `True (${topConflict.headline})`
    : "False";

  const statusLabel = snapshot.userStatus?.label ?? "Neutral";

  const lines = [
    "# [CURRENT SNAPSHOT]",
    `- Time: ${snapshot.currentDateTime.replace("T", " ").slice(0, 16)}`,
    `- User Status: ${statusLabel}`,
    `- Event Horizon Conflict: ${conflictLine}`,
    `- Apex Tasks Remaining: ${apexRemaining}`,
  ];

  if (snapshot.remainingSchedule.length > 0) {
    lines.push(
      `- Remaining Today: ${snapshot.remainingSchedule
        .slice(0, 4)
        .map((item) => `${item.time} ${item.task}`)
        .join("; ")}`
    );
  }

  if (snapshot.scheduleListBatch) {
    lines.push(
      `- Batch Schedule Detected: ${snapshot.scheduleListBatch.count} items on ${snapshot.scheduleListBatch.dateLabel}`
    );
  }

  if (snapshot.resolvedTemporal) {
    lines.push(`- Resolved Date: ${snapshot.resolvedTemporal.display}`);
  }

  return lines.join("\n");
}
