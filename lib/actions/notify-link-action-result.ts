import { toast } from "sonner";
import type { RunLinkActionResult } from "@/lib/actions/execute-link-action";
import type { Copy } from "@/lib/i18n/types";
import type { LinkActionItem } from "@/types/database";

export type LinkActionRunResult = RunLinkActionResult & {
  sharedText?: string | null;
  remindedAt?: string | null;
  scheduleMedium?: string | null;
  openedCalendar?: boolean;
  spoke?: boolean;
  speakError?: "unsupported" | "fetch_failed" | "empty_text" | "speech_failed";
};

export function notifyLinkActionResult(
  result: LinkActionRunResult,
  action: LinkActionItem,
  copy: Copy
) {
  if (result.sharedText) {
    toast.success(copy.remind.kakaoCopied, {
      description: copy.share.pasteHint,
    });
    return;
  }

  if (result.remindedAt) {
    if (result.openedCalendar) {
      toast.success(copy.remind.calendarOpened(result.remindedAt));
      return;
    }

    if (result.copiedText && result.scheduleMedium === "copy") {
      toast.success(copy.remind.copiedSchedule(result.remindedAt));
      return;
    }

    toast.success(copy.remind.scheduled(result.remindedAt));
    return;
  }

  if (result.spoke) {
    toast.success("🔊 오디오 재생을 시작했어요");
    return;
  }

  if (result.speakError) {
    toast.error("오디오 재생에 실패했어요. 잠시 후 다시 시도해 주세요.");
    return;
  }

  if (result.copiedText) {
    const isMapAction =
      /nmap:|kakaomap:|지도|map/i.test(`${action.label} ${action.href ?? ""}`);

    toast.success(
      isMapAction
        ? `"${result.copiedText}" 지명 복사 — 지도에서 확인하세요`
        : copy.behavior.foggCopied(result.copiedText)
    );
  }
}
