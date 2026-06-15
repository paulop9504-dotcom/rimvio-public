import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";
import { isGoogleSheetsUrl } from "@/lib/integrations/google-sheets-embed";
import {
  buildLinksheetUrlPromptWire,
  commitLinksheetUrl,
} from "@/lib/action-chat/mention-linksheet/linksheet-url-actions";
import {
  resolveMentionFeature,
} from "@/lib/event-kernel/action-contracts/mention-feature-registry";

const LINKSHEET_MENTION = /^@(\S+)(?:\s+([\s\S]*))?$/u;
const URL_IN_TEXT = /https?:\/\/[^\s]+/iu;

function createChatMessage(
  role: ActionChatMessage["role"],
  text: string,
  extra?: Partial<ActionChatMessage>,
): ActionChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

function extractSheetUrl(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }
  if (isGoogleSheetsUrl(trimmed)) {
    return trimmed;
  }
  return trimmed.match(URL_IN_TEXT)?.[0]?.trim() ?? null;
}

export function parseMentionLinksheetInput(
  raw: string,
): { query: string } | null {
  const trimmed = normalizeAtMentionInput(raw);
  const match = trimmed.match(LINKSHEET_MENTION);
  if (!match) {
    return null;
  }
  const feature = resolveMentionFeature(match[1] ?? "");
  if (!feature || feature.featureId !== "linksheet") {
    return null;
  }
  return { query: (match[2] ?? "").trim() };
}

export function isMentionLinksheetInput(text: string): boolean {
  return parseMentionLinksheetInput(text) !== null;
}

/** @링크시트 URL — save to resource pool + open embed immediately. */
export function tryBuildMentionLinksheetTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
}): ActionChatMessage[] | null {
  const parsed = parseMentionLinksheetInput(input.text);
  if (!parsed) {
    return null;
  }

  const normalized = normalizeAtMentionInput(input.text);
  const userMessage = createChatMessage("user", normalized, {
    chatAxis: input.chatAxis,
  });

  const sheetUrl = extractSheetUrl(parsed.query);
  if (!sheetUrl) {
    return [
      userMessage,
      createChatMessage("assistant", "", {
        inlineChatAction: buildLinksheetUrlPromptWire(),
        metadata: mentionOrchestratorMetadata({
          mention_feature: "linksheet",
          sourceRef: "mention:linksheet",
        }),
      }),
    ];
  }

  if (!isGoogleSheetsUrl(sheetUrl)) {
    return [
      userMessage,
      createChatMessage(
        "assistant",
        "Google Sheets 링크만 가능해요. docs.google.com/spreadsheets/… 형식인지 확인해 주세요.",
        {
          inlineChatAction: buildLinksheetUrlPromptWire(),
        },
      ),
    ];
  }

  const committed = commitLinksheetUrl(sheetUrl);
  if (!committed.ok) {
    return [
      userMessage,
      createChatMessage("assistant", committed.message, {
        inlineChatAction: buildLinksheetUrlPromptWire(),
      }),
    ];
  }

  return [
    userMessage,
    createChatMessage("assistant", "리소스풀 links에 저장했고 시트를 열었어요.", {
      metadata: mentionOrchestratorMetadata({
        mention_feature: "linksheet",
        sourceRef: "mention:linksheet",
        sheet_url: sheetUrl,
      }),
    }),
  ];
}

export function saveLinksheetToPool(url: string, title = "Google Sheets"): void {
  if (!isGoogleSheetsUrl(url)) {
    return;
  }
  commitLinksheetUrl(url);
}
