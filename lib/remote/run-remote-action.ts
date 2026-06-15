import { runLinkActionForLink } from "@/lib/actions/run-link-action-for-link";
import { trackActionClick, analyticsFromLink } from "@/lib/analytics/track-client";
import type { ContextRemoteState } from "@/lib/remote/resolve-context-remote";
import type { LinkActionItem, LinkRow } from "@/types/database";
import { toast } from "sonner";

function stubLinkForRemote(action: LinkActionItem): LinkRow {
  return {
    id: "context-remote",
    user_id: null,
    original_url: "https://rimvio.app/",
    title: action.label,
    thumbnail_url: null,
    domain: "rimvio.app",
    category: "uncategorized",
    actions: [],
    visual_mode: "brand",
    source_type: "portal",
    share_slug: null,
    link_status: "open",
    room_id: null,
    created_at: new Date().toISOString(),
    expires_at: null,
  };
}

export async function runRemoteAction(
  action: NonNullable<ContextRemoteState["primary"]>,
  link: LinkRow | null
) {
  if (action.href === "#copy-account" && action.payload?.copyText) {
    try {
      await navigator.clipboard.writeText(String(action.payload.copyText));
      toast.success("계좌번호를 복사했어요");
    } catch {
      toast.error("복사에 실패했어요");
    }
    return;
  }

  if (action.href === "#copy-text" && action.payload?.copyText) {
    try {
      await navigator.clipboard.writeText(String(action.payload.copyText));
      toast.success("복사했어요");
    } catch {
      toast.error("복사에 실패했어요");
    }
    return;
  }

  if (action.href === "#true-cost-receipt") {
    document.getElementById("true-cost-receipt")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    return;
  }

  const targetLink = link ?? stubLinkForRemote(action);
  const result = await runLinkActionForLink(action, targetLink);
  trackActionClick({
    ...analyticsFromLink(targetLink, "feed"),
    action,
    copySucceeded: Boolean(result.copiedText || result.sharedText || result.spoke),
  });

  if (result.spoke) {
    toast.success("🔊 오디오 재생을 시작했어요");
    return;
  }

  if (result.copiedText) {
    toast.success("복사했어요 — 앱에서 붙여넣기 하세요");
  }
}
