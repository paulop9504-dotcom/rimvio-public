"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { executeDeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/execute-lens-bubble";
import { fastCommitScheduleDraft } from "@/lib/peer-chat/ai-lens/fast-commit-schedule-draft";
import type { ScheduleConfirmDraft } from "@/lib/peer-chat/ai-lens/prepare-schedule-confirm";
import { undoLensScheduleCommit } from "@/lib/peer-chat/ai-lens/undo-lens-schedule-commit";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { resolveScheduleTrustZone } from "@/lib/plan-context/resolve-schedule-trust-zone";
import { recordActionTrustSuccess } from "@/lib/preferences/action-trust";

const UNDO_MS = 3000;

function readScheduleLensClicks(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  try {
    const raw = localStorage.getItem("rimvio.peer-lens-history.v1");
    if (!raw) {
      return 0;
    }
    const store = JSON.parse(raw) as Record<string, { clicked?: number }>;
    return store.schedule?.clicked ?? 0;
  } catch {
    return 0;
  }
}

function showFastCommitUndoToast(message: string, eventId: string) {
  toast.success(message, {
    duration: UNDO_MS,
    action: {
      label: "되돌리기",
      onClick: () => {
        if (undoLensScheduleCommit(eventId)) {
          toast.message("저장을 취소했어요", { duration: 2400 });
        } else {
          toast.error("되돌리지 못했어요");
        }
      },
    },
  });
}

export type LensBubbleActionsScope = {
  displayName: string;
  peerThreadId?: string;
};

export function useLensBubbleActions(scope: LensBubbleActionsScope | string) {
  const displayName = typeof scope === "string" ? scope : scope.displayName;
  const peerThreadId =
    typeof scope === "string" ? undefined : scope.peerThreadId?.trim() || undefined;
  const [mapPicker, setMapPicker] = useState<{
    open: boolean;
    place: string | null;
  }>({ open: false, place: null });

  const [scheduleConfirm, setScheduleConfirm] = useState<{
    open: boolean;
    draft: ScheduleConfirmDraft | null;
  }>({ open: false, draft: null });

  const handleLensSelect = useCallback(
    (candidate: DeepLinkBubbleCandidate, sourceMessageId?: string) => {
      const result = executeDeepLinkBubbleCandidate(candidate, {
        sourceMessageId,
        peerDisplayName: displayName,
        peerThreadId,
      });

      if (result.openScheduleConfirm) {
        const draft = result.openScheduleConfirm;
        const zone = resolveScheduleTrustZone({
          draft,
          scheduleLensClicks: readScheduleLensClicks(),
        });

        if (zone === "fast_commit") {
          const committed = fastCommitScheduleDraft(draft);
          if (!committed.ok) {
            toast.error(committed.message || "일정을 저장하지 못했어요");
            return;
          }
          recordActionTrustSuccess();
          if (committed.eventId) {
            showFastCommitUndoToast(committed.message, committed.eventId);
          } else {
            toast.success(committed.message);
          }
          return;
        }

        setScheduleConfirm({
          open: true,
          draft,
        });
        return;
      }

      if (result.openMapPicker?.place) {
        setMapPicker({ open: true, place: result.openMapPicker.place });
      }

      if (result.message) {
        if (result.ok) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      }
    },
    [displayName, peerThreadId],
  );

  const handleScheduleSaved = useCallback((message: string, eventId?: string) => {
    recordActionTrustSuccess();
    if (message) {
      toast.success(message);
    }
    void eventId;
  }, []);

  return {
    handleLensSelect,
    mapPicker,
    setMapPicker,
    scheduleConfirm,
    setScheduleConfirm,
    handleScheduleSaved,
  };
}
