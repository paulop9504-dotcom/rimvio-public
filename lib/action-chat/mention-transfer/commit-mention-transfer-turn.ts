import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import {
  mentionOrchestratorMetadata,
  type ActionChatMessage,
} from "@/lib/action-chat/orchestrator-types";
import {
  buildInlineChatTransferWire,
  toDutchPaySummaryWire,
} from "@/lib/action-chat/mention-transfer/inline-chat-transfer";
import {
  formatTransferAmountLabel,
  parseMentionTransferQuery,
} from "@/lib/action-chat/mention-transfer/parse-mention-transfer-query";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";

const TRANSFER_MENTION = /^@(송금|transfer|이체)(?:\s+(.*))?$/iu;

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

export function parseMentionTransferInput(raw: string): { query: string } | null {
  const trimmed = normalizeAtMentionInput(raw);
  const match = trimmed.match(TRANSFER_MENTION);
  if (!match) {
    return null;
  }
  return { query: (match[2] ?? "").trim() };
}

export function isMentionTransferInput(text: string): boolean {
  return parseMentionTransferInput(text) !== null;
}

/** Local @송금 turn — transfer deeplink + dutch summary, no orchestrator. */
export function tryBuildMentionTransferTurn(input: {
  text: string;
  chatAxis?: ChatAxis;
}): ActionChatMessage[] | null {
  const parsed = parseMentionTransferInput(input.text);
  if (!parsed) {
    return null;
  }

  const normalized = normalizeAtMentionInput(input.text);
  const userMessage = createChatMessage("user", normalized, {
    chatAxis: input.chatAxis,
  });

  const transfer = parseMentionTransferQuery(parsed.query);
  const providerLabel = transfer.provider === "kakaopay" ? "카카오페이" : "토스";
  const amountLabel = formatTransferAmountLabel(transfer.amountWon);
  const mainLabel =
    transfer.amountWon != null
      ? `${providerLabel} ${amountLabel}`
      : `${providerLabel} 송금`;

  return [
    userMessage,
    createChatMessage("assistant", "", {
      inlineChatTransfer: buildInlineChatTransferWire({
        query: parsed.query,
        amountWon: transfer.amountWon,
        provider: transfer.provider,
        mainLabel,
        dutchSummary: transfer.dutchSummary
          ? toDutchPaySummaryWire(transfer.dutchSummary)
          : null,
      }),
      metadata: mentionOrchestratorMetadata({
        mention_feature: "transfer",
        sourceRef: "mention:transfer",
      }),
    }),
  ];
}
