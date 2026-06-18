import { commitLensScheduleFromConfirm } from "@/lib/peer-chat/ai-lens/commit-schedule-from-lens";
import type { CommitLensScheduleResult } from "@/lib/peer-chat/ai-lens/commit-schedule-from-lens";
import type { ScheduleConfirmDraft } from "@/lib/peer-chat/ai-lens/prepare-schedule-confirm";

/** Trust-zone path — commit draft defaults without opening the sheet. */
export function fastCommitScheduleDraft(
  draft: ScheduleConfirmDraft,
): CommitLensScheduleResult {
  return commitLensScheduleFromConfirm({
    candidate: draft.candidate,
    sourceMessageId: draft.sourceMessageId,
    peerDisplayName: draft.peerDisplayName,
    promoteToFeed: draft.feedOptInDefault && draft.intent.suggestFeed,
    intent: draft.intent,
    datetimeIso: draft.datetimeIso,
    title: draft.title,
    place: draft.place,
    planContext: draft.planContext,
  });
}
