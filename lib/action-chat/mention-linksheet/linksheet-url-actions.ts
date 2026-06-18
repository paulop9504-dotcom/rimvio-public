import { buildInlineChatActionWire } from "@/lib/action-chat/mention-actions/inline-chat-action";
import { emitOpenGoogleSheet } from "@/lib/integrations/google-sheets-open-event";
import { isGoogleSheetsUrl } from "@/lib/integrations/google-sheets-embed";
import { addResourcePoolItem } from "@/lib/resource-pool/resource-pool-store";

export type LinksheetCommitResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/** Save pool + open embed — shared by @링크시트 turn and inline chip. */
export function commitLinksheetUrl(rawUrl: string): LinksheetCommitResult {
  const url = rawUrl.trim();
  if (!url) {
    return { ok: false, message: "URL을 입력해 주세요." };
  }
  if (!isGoogleSheetsUrl(url)) {
    return {
      ok: false,
      message: "Google Sheets 링크만 가능해요. docs.google.com/spreadsheets/…",
    };
  }

  const title = "Google Sheets";
  addResourcePoolItem({
    repoId: "links",
    kind: "link",
    title,
    body: url,
    url,
  });

  emitOpenGoogleSheet({ url, title });
  return { ok: true, url };
}

export function buildLinksheetUrlPromptWire() {
  return buildInlineChatActionWire({
    featureId: "linksheet",
    displayName: "링크시트",
    icon: "📊",
    query: "",
    summaryLines: ["Google Sheets URL을 입력하거나 붙여 넣으세요"],
    mainLabel: "열기",
    mainActionKind: "internal",
    linksheetUrlPrompt: true,
  });
}
